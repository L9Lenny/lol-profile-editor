/**
 * @name Rank Override
 * @description Overrides rank display in League client profile overview
 * @author L9Lenny
 */

var overrideRank = null
var observer = null
var cssInjected = false
var overviewEnabled = true
var touchedElements = []

function log(msg) { console.log('[RankOverride] ' + msg) }

function rememberAttribute(element, name) {
  if (!element._rankOverrideOriginal) {
    element._rankOverrideOriginal = {}
    touchedElements.push(element)
  }
  if (!(name in element._rankOverrideOriginal)) element._rankOverrideOriginal[name] = element.getAttribute(name)
}

function rememberText(element) {
  if (!element || element._rankOverrideOriginalText !== undefined) return
  element._rankOverrideOriginalText = element.textContent
  touchedElements.push(element)
}

function restoreOverrides() {
  for (var i = 0; i < touchedElements.length; i++) {
    var element = touchedElements[i]
    var attrs = element._rankOverrideOriginal
    if (attrs) {
      for (var name in attrs) {
        if (attrs[name] === null) element.removeAttribute(name)
        else element.setAttribute(name, attrs[name])
      }
      delete element._rankOverrideOriginal
    }
    if (element._rankOverrideOriginalText !== undefined) {
      element.textContent = element._rankOverrideOriginalText
      delete element._rankOverrideOriginalText
    }
    // Regalia web components cache emblem art internally; reconnect them so
    // removing the override attributes also refreshes the rendered icon.
    if (element.isConnected && (element.tagName === 'LOL-REGALIA-CREST-V2-ELEMENT' || element.tagName === 'LOL-REGALIA-EMBLEM-ELEMENT')) {
      element.replaceWith(element.cloneNode(true))
    }
  }
  touchedElements = []
}

async function fetchDesiredRank() {
  try {
    var configRes = await fetch('//plugins/rank-override/rank-config.json?t=' + Date.now(), { cache: 'no-store' })
    if (configRes.ok) {
      var config = await configRes.json()
      // The settings reset writes NONE. Treat it as an explicit clear instead
      // of falling back to stale LCU data from a previous queue.
      if (config.tier === 'NONE' || !config.tier) return null
      return {
        tier: config.tier,
        division: config.division || 'I',
        queue: config.queue || 'RANKED_SOLO_5x5',
        leaguePoints: Math.max(0, parseInt(config.leaguePoints, 10) || 0)
      }
    }
  } catch (e) {}

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
        queue: lol.rankedLeagueQueue || 'RANKED_SOLO_5x5',
        leaguePoints: 0
      }
    }
    return null
  } catch (e) { return null }
}

function injectCSS() {
  if (cssInjected || document.getElementById('rank-override-css')) return
  cssInjected = true
  var style = document.createElement('style')
  style.id = 'rank-override-css'
  style.textContent = '.style-profile-emblem-header-subtitle, .style-profile-emblem-subheader-ranked { color: #ffffff !important; }'
  document.head.appendChild(style)
}

function removeCSS() {
  var style = document.getElementById('rank-override-css')
  if (style) style.remove()
  cssInjected = false
}

function isTargetWrapper(wrapper, rank) {
  var title = wrapper.querySelector('.style-profile-emblem-header-title')
  if (!title) return false
  var titleText = title.textContent.toLowerCase()
  return (rank.queue === 'RANKED_SOLO_5x5' && (titleText.indexOf('solo') >= 0 || titleText.indexOf('duo') >= 0)) ||
         (rank.queue === 'RANKED_FLEX_SR' && titleText.indexOf('flex') >= 0) ||
         (rank.queue === 'RANKED_PREMADE_5x5' && titleText.indexOf('5v5') >= 0 && titleText.indexOf('flex') < 0) ||
         (rank.queue === 'RANKED_TFT' && titleText.indexOf('tft') >= 0 && titleText.indexOf('double') < 0) ||
         (rank.queue === 'RANKED_TFT_DOUBLE_UP' &&
           (titleText.indexOf('double') >= 0 || titleText.indexOf('2v2') >= 0 ||
             (titleText.indexOf('tft') >= 0 && titleText.indexOf('duo') >= 0)))
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
        q.set('leaguePoints', rank.leaguePoints)
      } else {
        q.tier = rank.tier
        q.division = rank.division
        q.leaguePoints = rank.leaguePoints
      }
    }
  }
}

function interceptRankedData(data, rank) {
  if (!data || !rank) return data
  if (data.queues) patchRankedQueues(data.queues, rank)
  if (data.queueMap && data.queueMap[rank.queue]) patchRankedQueues([data.queueMap[rank.queue]], rank)
  if (data.highestRankedEntry && data.highestRankedEntry.queueType === rank.queue) patchRankedQueues([data.highestRankedEntry], rank)
  if (data.highestRankedEntrySR && data.highestRankedEntrySR.queueType === rank.queue) patchRankedQueues([data.highestRankedEntrySR], rank)
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
    if (sub && sub.innerText !== text) {
      rememberText(sub)
      sub.innerText = text
    }
    var ranked = wrappers[i].querySelector('.style-profile-emblem-subheader-ranked')
    if (ranked && ranked.innerText !== text) {
      rememberText(ranked)
      ranked.innerText = text
    }
    var masteryScore = wrappers[i].querySelector('.style-profile-champion-mastery-score')
    if (masteryScore && masteryScore.textContent !== String(rank.leaguePoints)) {
      rememberText(masteryScore)
      masteryScore.textContent = String(rank.leaguePoints)
    }
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
      (rank.queue === 'RANKED_TFT_DOUBLE_UP' &&
        (labelText.indexOf('double') >= 0 || labelText.indexOf('2v2') >= 0 ||
          (labelText.indexOf('tft') >= 0 && labelText.indexOf('duo') >= 0)))
    if (!isTargetQueue) continue

    var emblem = tooltipQueues[q].querySelector('lol-regalia-emblem-element')
    var emblemDivision = noDiv ? 'O' : div
    if (emblem) {
      rememberAttribute(emblem, 'ranked-tier')
      rememberAttribute(emblem, 'ranked-division')
      emblem.setAttribute('ranked-tier', tier.toLowerCase())
      emblem.setAttribute('ranked-division', emblemDivision)
      if (emblem.shadowRoot) {
        var innerEmblem = emblem.shadowRoot.querySelector('div > div')
        if (innerEmblem) {
          rememberAttribute(innerEmblem, 'ranked-tier')
          rememberAttribute(innerEmblem, 'ranked-division')
          innerEmblem.setAttribute('ranked-tier', tier.toLowerCase())
          innerEmblem.setAttribute('ranked-division', emblemDivision)
        }
      }
    }

    var tooltipTier = tooltipQueues[q].querySelector('.ranked-tooltip-queue-tier')
    if (tooltipTier && tooltipTier.textContent !== text) {
      rememberText(tooltipTier)
      tooltipTier.textContent = text
    }
    var lpContainer = tooltipQueues[q].querySelector('.style-profile-ranked-crest-tooltip-lp')
    var lpSpans = lpContainer ? lpContainer.querySelectorAll('span') : []
    if (lpSpans[1] && lpSpans[1].textContent !== String(rank.leaguePoints)) {
      rememberText(lpSpans[1])
      lpSpans[1].textContent = String(rank.leaguePoints)
    }
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
      rememberAttribute(crest, 'ranked-tier')
      rememberAttribute(crest, 'ranked-division')
      rememberAttribute(crest, 'crest-type')
      crest.setAttribute('ranked-tier', tierLower)
      crest.setAttribute('ranked-division', rank.division)
      crest.setAttribute('crest-type', 'ranked')
      if (crest.shadowRoot) {
        var divEl = crest.shadowRoot.querySelector('.lol-regalia-rank-division-text')
        if (divEl && divEl.textContent !== rank.division) {
          rememberText(divEl)
          divEl.textContent = rank.division
        }
      }
    }

    var emblems = wrappers[i].querySelectorAll('lol-regalia-emblem-element')
    for (var e = 0; e < emblems.length; e++) {
        rememberAttribute(emblems[e], 'ranked-tier')
        rememberAttribute(emblems[e], 'queue-type')
        emblems[e].setAttribute('ranked-tier', rank.tier)
        emblems[e].setAttribute('queue-type', rank.queue)
    }
  }
}

function applyRank(rank) {
  if (!overviewEnabled || !rank) {
    restoreOverrides()
    removeCSS()
    return
  }
  injectCSS()
  overrideText(rank)
  patchEmblemAttributes(rank)
}

function startPolling() {
  setTimeout(function() { applyRank(overrideRank) }, 2000)
  setTimeout(function() { applyRank(overrideRank) }, 5000)
  setInterval(function() {
    Promise.all([fetchDesiredRank(), fetchOverviewSetting()]).then(function(values) {
      var newRank = values[0]
      var newOverviewEnabled = values[1]
      if (newRank !== null || overrideRank !== null) {
        if (!newRank || !overrideRank ||
            newRank.tier !== overrideRank.tier || newRank.division !== overrideRank.division ||
            newRank.queue !== overrideRank.queue || newRank.leaguePoints !== overrideRank.leaguePoints) {
          log('Rank changed -> reapplying')
          overrideRank = newRank
        }
      }
      overviewEnabled = newOverviewEnabled
      applyRank(overrideRank)
    })
  }, 5000)
  log('Polling started')
}

function init() {
  Promise.all([fetchDesiredRank(), fetchOverviewSetting()]).then(function(values) {
    var rank = values[0]
    overviewEnabled = values[1]
    overrideRank = rank
    if (rank) log('Rank: ' + rank.tier + ' ' + rank.division + ' (' + rank.queue + ')')
    else log('No rank found; waiting for config changes')
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
