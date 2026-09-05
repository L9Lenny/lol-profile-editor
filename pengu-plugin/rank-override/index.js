/**
 * @name Rank Override
 * @description Overrides rank display in League client profile overview
 * @author L9Lenny
 */

var overrideRank = null
var observer = null
var cssInjected = false
var overviewEnabled = true

function log(msg) { console.log('[RankOverride] ' + msg) }

async function fetchDesiredRank() {
  try {
    var res = await fetch('/lol-chat/v1/me', { credentials: 'include' })
    if (!res.ok) return null
    var data = await res.json()
    if (!data || !data.lol) return null
    var lol = typeof data.lol === 'string' ? JSON.parse(data.lol) : data.lol
    if (lol.rankedLeagueTier && lol.rankedLeagueTier !== 'NONE') {
      return {
        tier: lol.rankedLeagueTier,
        division: lol.rankedLeagueDivision || 'I',
        queue: lol.rankedLeagueQueue || 'RANKED_SOLO_5x5'
      }
    }
    return null
  } catch (e) { return null }
}

function injectCSS() {
  if (cssInjected) return
  cssInjected = true
  var style = document.createElement('style')
  style.textContent = '.style-profile-emblem-header-subtitle, .style-profile-emblem-subheader-ranked { color: #ffffff !important; }'
  document.head.appendChild(style)
}

function isTargetWrapper(wrapper, rank) {
  var title = wrapper.querySelector('.style-profile-emblem-header-title')
  if (!title) return false
  var titleText = title.textContent.toLowerCase()
  return (rank.queue === 'RANKED_SOLO_5x5' && (titleText.indexOf('solo') >= 0 || titleText.indexOf('duo') >= 0)) ||
         (rank.queue === 'RANKED_FLEX_SR' && titleText.indexOf('flex') >= 0) ||
         (rank.queue === 'RANKED_PREMADE_5x5' && titleText.indexOf('5v5') >= 0 && titleText.indexOf('flex') < 0) ||
         (rank.queue === 'RANKED_TFT' && titleText.indexOf('tft') >= 0 && titleText.indexOf('double') < 0) ||
         (rank.queue === 'RANKED_TFT_DOUBLE_UP' && titleText.indexOf('double') >= 0)
}

async function fetchOverviewSetting() {
  try {
    var res = await fetch('//plugins/rank-override/rank-config.json?t=' + Date.now(), { cache: 'no-store' })
    if (!res.ok) return true
    var config = await res.json()
    return config.overviewEnabled !== false
  } catch (e) { return true }
}

function queryAllDeep(root, selector) {
  var results = Array.prototype.slice.call(root.querySelectorAll(selector))
  var elements = root.querySelectorAll('*')
  for (var i = 0; i < elements.length; i++) {
    if (elements[i].shadowRoot) {
      results = results.concat(queryAllDeep(elements[i].shadowRoot, selector))
    }
  }
  return results
}

function patchRankedQueues(queues, rank) {
  if (!queues || !rank) return
  for (var i = 0; i < queues.length; i++) {
    var q = queues[i]
    var qt = q.queueType || (q.get && q.get('queueType'))
    if (qt === rank.queue) {
      if (q.set) {
        q.set('tier', rank.tier)
        q.set('division', rank.division)
      } else {
        q.tier = rank.tier
        q.division = rank.division
      }
    }
  }
}

function interceptRankedData(data, rank) {
  if (!data || !rank) return data
  if (data.queues) patchRankedQueues(data.queues, rank)
  if (data.rankedLeagueTier !== undefined) data.rankedLeagueTier = rank.tier
  if (data.rankedLeagueDivision !== undefined) data.rankedLeagueDivision = rank.division
  if (data.highestAchievedSeasonTier !== undefined) data.highestAchievedSeasonTier = rank.tier
  if (data.lol) {
    try {
      var lol = typeof data.lol === 'string' ? JSON.parse(data.lol) : data.lol
      if (lol.rankedLeagueTier) lol.rankedLeagueTier = rank.tier
      if (lol.rankedLeagueDivision) lol.rankedLeagueDivision = rank.division
      if (lol.rankedLeagueQueue) lol.rankedLeagueQueue = rank.queue
      data.lol = typeof data.lol === 'string' ? JSON.stringify(lol) : lol
    } catch (e) {}
  }
  return data
}

function isRankedUrl(url) {
  return url.indexOf('/lol-ranked/') >= 0 || url.indexOf('/lol-summoner/v1/current-summoner') >= 0
}

function installFetchInterceptor() {
  var origFetch = window.fetch
  window.fetch = function() {
    var url = typeof arguments[0] === 'string' ? arguments[0] : ''
    if (!isRankedUrl(url)) return origFetch.apply(this, arguments)
    log('Intercepted fetch: ' + url)
    return origFetch.apply(this, arguments).then(function(res) {
      var cloned = res.clone()
      return cloned.json().then(function(data) {
        if (overviewEnabled && overrideRank) data = interceptRankedData(data, overrideRank)
        return new Response(JSON.stringify(data), {
          status: res.status, statusText: res.statusText, headers: res.headers
        })
      })['catch'](function() { return res })
    })
  }
  log('Fetch interceptor installed')
}

function installXHRInterceptor() {
  var origOpen = XMLHttpRequest.prototype.open
  var origSend = XMLHttpRequest.prototype.send
  XMLHttpRequest.prototype.open = function(method, url) {
    this._rankUrl = url
    return origOpen.apply(this, arguments)
  }
  XMLHttpRequest.prototype.send = function() {
    var self = this
    var url = self._rankUrl || ''
    if (isRankedUrl(url)) {
      log('Intercepted XHR: ' + url)
      self.addEventListener('readystatechange', function() {
        if (self.readyState === 4 && self.status === 200) {
          try {
            var data = JSON.parse(self.responseText)
            if (overviewEnabled && overrideRank) data = interceptRankedData(data, overrideRank)
            var body = JSON.stringify(data)
            Object.defineProperty(self, 'responseText', { value: body, configurable: true })
            Object.defineProperty(self, 'response', { value: body, configurable: true })
          } catch (e) {}
        }
      })
    }
    return origSend.apply(this, arguments)
  }
  log('XHR interceptor installed')
}

function overrideText(rank) {
  if (!rank) return
  var tier = rank.tier
  var div = rank.division
  var noDiv = ['MASTER', 'GRANDMASTER', 'CHALLENGER'].indexOf(tier) >= 0
  var text = noDiv ? tier : tier + ' ' + div

  var wrappers = document.querySelectorAll('.style-profile-emblem-wrapper')
  for (var i = 0; i < wrappers.length; i++) {
    if (!isTargetWrapper(wrappers[i], rank)) continue
    var sub = wrappers[i].querySelector('.style-profile-emblem-header-subtitle')
    if (sub && sub.innerText !== text) sub.innerText = text
    var ranked = wrappers[i].querySelector('.style-profile-emblem-subheader-ranked')
    if (ranked && ranked.innerText !== text) ranked.innerText = text
  }

  var tooltipQueues = queryAllDeep(document, '.ranked-tooltip-queue')
  for (var q = 0; q < tooltipQueues.length; q++) {
    var queueLabel = tooltipQueues[q].querySelector('.ranked-tooltip-queue-name')
    if (!queueLabel) continue
    var labelText = queueLabel.textContent.toLowerCase()
    var isTargetQueue =
      (rank.queue === 'RANKED_SOLO_5x5' && (labelText.indexOf('solo') >= 0 || labelText.indexOf('duo') >= 0)) ||
      (rank.queue === 'RANKED_FLEX_SR' && labelText.indexOf('flex') >= 0) ||
      (rank.queue === 'RANKED_PREMADE_5x5' && labelText.indexOf('5v5') >= 0 && labelText.indexOf('flex') < 0) ||
      (rank.queue === 'RANKED_TFT' && labelText.indexOf('tft') >= 0 && labelText.indexOf('double') < 0) ||
      (rank.queue === 'RANKED_TFT_DOUBLE_UP' && labelText.indexOf('double') >= 0)
    if (!isTargetQueue) continue

    var emblem = tooltipQueues[q].querySelector('lol-regalia-emblem-element')
    var emblemDivision = noDiv ? 'O' : div
    if (emblem) {
      emblem.setAttribute('ranked-tier', tier.toLowerCase())
      emblem.setAttribute('ranked-division', emblemDivision)
      if (emblem.shadowRoot) {
        var innerEmblem = emblem.shadowRoot.querySelector('div > div')
        if (innerEmblem) {
          innerEmblem.setAttribute('ranked-tier', tier.toLowerCase())
          innerEmblem.setAttribute('ranked-division', emblemDivision)
        }
      }
    }

    var tooltipTier = tooltipQueues[q].querySelector('.ranked-tooltip-queue-tier')
    if (tooltipTier && tooltipTier.textContent !== text) tooltipTier.textContent = text
  }
}

function patchEmblemAttributes(rank) {
  if (!rank) return
  var tierLower = rank.tier.toLowerCase()

  var wrappers = document.querySelectorAll('.style-profile-emblem-wrapper')
  for (var i = 0; i < wrappers.length; i++) {
    if (!isTargetWrapper(wrappers[i], rank)) continue

    var crests = wrappers[i].querySelectorAll('lol-regalia-crest-v2-element')
    for (var c = 0; c < crests.length; c++) {
      var crest = crests[c]
      crest.setAttribute('ranked-tier', tierLower)
      crest.setAttribute('ranked-division', rank.division)
      crest.setAttribute('crest-type', 'ranked')
      if (crest.shadowRoot) {
        var divEl = crest.shadowRoot.querySelector('.lol-regalia-rank-division-text')
        if (divEl && divEl.textContent !== rank.division) divEl.textContent = rank.division
      }
    }

    var emblems = wrappers[i].querySelectorAll('lol-regalia-emblem-element')
    for (var e = 0; e < emblems.length; e++) {
      emblems[e].setAttribute('ranked-tier', rank.tier)
      emblems[e].setAttribute('queue-type', rank.queue)
    }
  }
}

function applyRank(rank) {
  if (!overviewEnabled || !rank) return
  injectCSS()
  overrideText(rank)
  patchEmblemAttributes(rank)
}

function startPolling() {
  setTimeout(function() { applyRank(overrideRank) }, 2000)
  setTimeout(function() { applyRank(overrideRank) }, 5000)
  setInterval(function() {
    fetchDesiredRank().then(function(newRank) {
      if (newRank && overrideRank &&
          (newRank.tier !== overrideRank.tier || newRank.division !== overrideRank.division || newRank.queue !== overrideRank.queue)) {
        log('Rank changed -> reapplying')
        overrideRank = newRank
      }
      applyRank(overrideRank)
    })
  }, 5000)
  log('Polling started')
}

function init() {
  Promise.all([fetchDesiredRank(), fetchOverviewSetting()]).then(function(values) {
    var rank = values[0]
    overviewEnabled = values[1]
    if (!rank) { log('No rank found'); return }
    overrideRank = rank
    log('Rank: ' + rank.tier + ' ' + rank.division + ' (' + rank.queue + ')')
    log('Profile Overview override: ' + (overviewEnabled ? 'enabled' : 'disabled'))

    installFetchInterceptor()
    installXHRInterceptor()

    function attachObserver() {
      if (!document.body) { setTimeout(attachObserver, 500); return }
      injectCSS()
      observer = new MutationObserver(function() { applyRank(overrideRank) })
      observer.observe(document.body, { childList: true, subtree: true })
      log('Observer attached')
      startPolling()
    }
    attachObserver()
  })
}

export default function(context) {
  log('Plugin starting')
  init()
}
