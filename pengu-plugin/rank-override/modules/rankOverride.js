/**
 * Rank Override Module
 * 
 * Reads rank config from rank-config.json (written by Tauri app)
 * and overrides the rank display in League client profile overview.
 */

let log = console.log
let pluginFs = null
let observer = null
let currentRank = null
let pollInterval = null

const EMBLEM_BASE = 'https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/ranked-emblems'

const QUEUE_MAP = {
  'RANKED_SOLO_5x5': 'ranked',
  'RANKED_FLEX_SR': 'flex',
  'RANKED_FLEX_TT': 'flex',
  'RANKED_TFT': 'tft'
}

function getEmblemUrl(tier) {
  return `${EMBLEM_BASE}/${tier.toLowerCase()}.png`
}

async function readConfig() {
  if (!pluginFs) return null
  try {
    const content = await pluginFs.read('rank-config.json')
    if (!content) return null
    const config = JSON.parse(content)
    if (config.tier && config.tier !== 'NONE') {
      return {
        tier: config.tier,
        division: config.division || 'I',
        queue: config.queue || 'RANKED_SOLO_5x5'
      }
    }
    return null
  } catch (e) {
    log(`Error reading config: ${e.message}`)
    return null
  }
}

/**
 * Check if an element belongs to the selected queue
 */
function matchesQueue(element) {
  if (!currentRank) return true

  const targetQueue = QUEUE_MAP[currentRank.queue] || 'ranked'

  // Check crest-type attribute
  const crestType = element.getAttribute('crest-type')
  if (crestType) {
    return crestType === targetQueue || targetQueue === 'ranked'
  }

  // Check ranked-queue attribute
  const rankedQueue = element.getAttribute('ranked-queue')
  if (rankedQueue) {
    return rankedQueue === targetQueue || targetQueue === 'ranked'
  }

  // For profile overview, only override if it's the ranked section
  return true
}

/**
 * Deep traverse shadow DOM to find elements
 */
function queryShadow(root, selector) {
  if (!root) return null
  let el = root.querySelector(selector)
  if (el) return el

  // Search in shadow roots
  const all = root.querySelectorAll('*')
  for (const child of all) {
    if (child.shadowRoot) {
      el = queryShadow(child.shadowRoot, selector)
      if (el) return el
    }
  }
  return null
}

function queryShadowAll(root, selector) {
  const results = []
  if (!root) return results

  results.push(...root.querySelectorAll(selector))

  const all = root.querySelectorAll('*')
  for (const child of all) {
    if (child.shadowRoot) {
      results.push(...queryShadowAll(child.shadowRoot, selector))
    }
  }
  return results
}

/**
 * Override a regalia crest element's rank display
 */
function overrideCrest(crest, rank) {
  if (!crest) return

  const tier = rank.tier.toLowerCase()
  const div = rank.division

  // Set attributes on the crest element
  crest.setAttribute('ranked-tier', tier)
  crest.setAttribute('ranked-division', div)
  crest.setAttribute('crest-type', QUEUE_MAP[rank.queue] || 'ranked')

  if (!crest.shadowRoot) return

  // Find and update division text
  const divisionEl = crest.shadowRoot.querySelector('.lol-regalia-rank-division-text')
  if (divisionEl) {
    divisionEl.textContent = div
    log(`Updated division text to: ${div}`)
  }

  // Find and update tier text (if exists)
  const tierEl = crest.shadowRoot.querySelector('.lol-regalia-ranked-tier-text')
  if (tierEl) {
    tierEl.textContent = rank.tier
  }

  // Find and override emblem image
  const emblemEl = crest.shadowRoot.querySelector('.regalia-emblem')
  if (emblemEl) {
    const url = getEmblemUrl(rank.tier)
    emblemEl.style.backgroundImage = `url("${url}")`
    emblemEl.style.backgroundSize = 'contain'
    emblemEl.style.backgroundRepeat = 'no-repeat'
    emblemEl.style.backgroundPosition = 'center'
    log(`Updated emblem image`)
  }

  // Override any img elements with rank emblem
  const imgs = crest.shadowRoot.querySelectorAll('img')
  for (const img of imgs) {
    if (img.src && (img.src.includes('ranked') || img.src.includes('emblem') || img.src.includes('tier'))) {
      img.src = getEmblemUrl(rank.tier)
      log(`Updated img src to: ${getEmblemUrl(rank.tier)}`)
    }
  }

  // Show ranked border
  const rankedBorder = crest.shadowRoot.querySelector('.lol-regalia-ranked-border-container')
  if (rankedBorder) {
    rankedBorder.style.display = ''
  }

  // Deep search for more elements
  const allShadow = queryShadowAll(crest.shadowRoot, '*')
  for (const el of allShadow) {
    // Update division text in nested shadows
    if (el.classList && el.classList.contains('lol-regalia-rank-division-text')) {
      el.textContent = div
    }
    // Update emblem in nested shadows
    if (el.classList && el.classList.contains('regalia-emblem')) {
      const url = getEmblemUrl(rank.tier)
      el.style.backgroundImage = `url("${url}")`
      el.style.backgroundSize = 'contain'
    }
  }
}

/**
 * Override profile regalia (the big crest on profile page)
 */
function overrideProfileRegalia() {
  if (!currentRank) return

  const profiles = document.querySelectorAll('lol-regalia-profile-v2-element')
  log(`Found ${profiles.length} profile regalia elements`)

  for (const profile of profiles) {
    if (!profile.shadowRoot) continue

    // Check if this matches the selected queue
    if (!matchesQueue(profile)) continue

    const crest = profile.shadowRoot.querySelector('.regalia-profile-crest-element')
    if (crest) {
      overrideCrest(crest, currentRank)
    }
  }
}

/**
 * Override hovercard regalia
 */
function overrideHovercardRegalia() {
  if (!currentRank) return

  const hovercards = document.querySelectorAll('lol-regalia-hovercard-v2-element')
  for (const hover of hovercards) {
    if (!hover.shadowRoot) continue
    if (!matchesQueue(hover)) continue

    const crest = hover.shadowRoot.querySelector('.regalia-hovercard-crest-element')
    if (crest) {
      overrideCrest(crest, currentRank)
    }
  }
}

/**
 * Override party crests
 */
function overridePartyCreasts() {
  if (!currentRank) return

  const parties = document.querySelectorAll('lol-regalia-parties-v2-element')
  for (const party of parties) {
    if (!party.shadowRoot) continue

    const crests = party.shadowRoot.querySelectorAll('lol-regalia-crest-v2-element')
    for (const crest of crests) {
      if (!matchesQueue(crest)) continue
      overrideCrest(crest, currentRank)
    }
  }
}

/**
 * Override profile text elements (rank name shown below emblem)
 */
function overrideProfileText() {
  if (!currentRank) return

  // Override profile emblem subtitle
  const subtitleContainers = document.querySelectorAll('.style-profile-emblem-subheader-ranked')
  for (const container of subtitleContainers) {
    const subtitle = container.querySelector('.style-profile-emblem-header-subtitle')
    if (subtitle) {
      subtitle.textContent = `${currentRank.tier} ${currentRank.division}`
      log(`Updated profile subtitle to: ${currentRank.tier} ${currentRank.division}`)
    }
  }

  // Override customizer border title
  const borderContainers = document.querySelectorAll('.identity-customizer-border-container')
  for (const container of borderContainers) {
    const title = container.querySelector('.identity-customizer-border-title')
    if (title) {
      title.textContent = `${currentRank.tier} ${currentRank.division}`
    }
  }

  // Override ranked tooltips - ONLY for selected queue
  const tooltipQueues = document.querySelectorAll('.ranked-tooltip-queue')
  for (const queueItem of tooltipQueues) {
    const queueLabel = queueItem.querySelector('.ranked-tooltip-queue-label')
    if (!queueLabel) continue

    const labelText = queueLabel.textContent.toLowerCase()
    const isTargetQueue =
      (currentRank.queue === 'RANKED_SOLO_5x5' && (labelText.includes('solo') || labelText.includes('duo'))) ||
      (currentRank.queue === 'RANKED_FLEX_SR' && labelText.includes('flex'))

    if (!isTargetQueue) continue

    const tierEl = queueItem.querySelector('.ranked-tooltip-queue-tier')
    if (tierEl) {
      tierEl.textContent = `${currentRank.tier} ${currentRank.division}`
    }
  }
}

/**
 * Apply all rank overrides
 */
function applyAllOverrides() {
  overrideProfileRegalia()
  overrideHovercardRegalia()
  overridePartyCreasts()
  overrideProfileText()
}

/**
 * Start the rank override system
 */
export async function startRankOverride(writeLog, fs) {
  if (writeLog) log = writeLog
  pluginFs = fs
  if (observer) return

  log('startRankOverride called')

  // Read config from file
  currentRank = await readConfig()
  log(`Config loaded: ${currentRank ? `${currentRank.tier} ${currentRank.division} (${currentRank.queue})` : 'null'}`)

  applyAllOverrides()

  // MutationObserver for DOM changes
  observer = new MutationObserver(() => {
    applyAllOverrides()
  })
  observer.observe(document.body, { childList: true, subtree: true })
  log('MutationObserver attached')

  // Poll for config changes
  pollInterval = setInterval(async () => {
    const newRank = await readConfig()
    if (newRank && (
      !currentRank ||
      newRank.tier !== currentRank.tier ||
      newRank.division !== currentRank.division ||
      newRank.queue !== currentRank.queue
    )) {
      currentRank = newRank
      log(`Config changed: ${currentRank.tier} ${currentRank.division} (${currentRank.queue})`)
      applyAllOverrides()
    }
  }, 3000)
  log('Config polling started (3s interval)')
}

/**
 * Stop the rank override system
 */
export function stopRankOverride() {
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
  currentRank = null
}
