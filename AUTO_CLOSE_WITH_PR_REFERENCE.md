# Auto-Close Issues con Reference alla PR

## ✨ Cosa è Stato Implementato

Quando una issue viene chiusa automaticamente, il sistema **aggiunge un commento indicando quale PR l'ha fixata**.

## 📝 Commento Automatico

Quando un'issue viene chiusa per essere stata fixata, ora riceve un commento del genere:

```markdown
## ✅ Automatically Resolved

This issue has been automatically detected as resolved!

**SonarQube Key**: `AZx-EEoAunfcaXKFAC4P`

**Fixed By**: [PR #25](https://github.com/L9Lenny/lol-profile-editor/pull/25) - fix: use globalThis instead of window

The SonarQube analysis no longer shows this issue in the codebase, indicating it has been fixed.

---
This detection was automated by comparing SonarQube analysis results.
```

## 🎯 Flusso Completo

```
1. Sviluppatore crea PR #25
2. Commit il fix
3. Push → GitHub Actions esegue SonarQube
4. SonarQube rileva che l'issue è stata fixata
5. Script auto-close confronta:
   - GitHub issue #42 è aperta (AZx-EEoAunfcaXKFAC4P)
   - SonarQube NON ha più AZx-EEoAunfcaXKFAC4P
6. **Chiude issue #42**
7. **Aggiunge commento con riferimento a PR #25**
8. ✅ Collegamento completo: Issue → PR

Result:
- Issue #42: CLOSED
- Commento: "Fixed By: PR #25 - fix: use globalThis instead of window"
```

## 📁 File Modificati

### Workflow
**File**: `.github/workflows/sonarqube-issues.yml`

```yaml
- name: Auto-close resolved issues
  env:
    ...
    PR_NUMBER: ${{ github.event.pull_request.number }}      # ← Numero PR
    PR_URL: ${{ github.event.pull_request.html_url }}       # ← Link PR
    PR_TITLE: ${{ github.event.pull_request.title }}        # ← Titolo PR
  run: node .github/scripts/auto-detect-fixed-issues.js
```

### Script
**File**: `.github/scripts/auto-detect-fixed-issues.js`

```javascript
// PR information (optional, from GitHub Actions)
const PR_NUMBER = process.env.PR_NUMBER || null;
const PR_URL = process.env.PR_URL || null;
const PR_TITLE = process.env.PR_TITLE || null;

// Nel commento:
if (PR_NUMBER && PR_URL) {
  commentBody += `\n\n**Fixed By**: [PR #${PR_NUMBER}](${PR_URL})`;
  if (PR_TITLE) {
    commentBody += ` - ${PR_TITLE}`;
  }
}
```

## 📊 Esempio Pratico

### Scenario: Fissare issue di SonarQube

#### Passo 1: Issue creata
```
GitHub Issue #42
Title: [MINOR] Use globalThis instead of window (AZx-EEoAunfcaXKFAC4P)
Status: OPEN
```

#### Passo 2: Sviluppatore crea PR
```
PR #25: "fix: use globalThis instead of window"

Codice:
- window.someAPI  → globalThis.someAPI
```

#### Passo 3: Push → Workflow esegue
```
✅ SonarQube analizza PR #25
✅ Rileva che AZx-EEoAunfcaXKFAC4P è fixata
✅ Script auto-close chiude issue #42
✅ Aggiunge commento con link a PR #25
```

#### Passo 4: Risultato su GitHub
```
GitHub Issue #42
Status: CLOSED ✅

Commento aggiunto:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## ✅ Automatically Resolved

This issue has been automatically detected as resolved!

SonarQube Key: AZx-EEoAunfcaXKFAC4P

**Fixed By: PR #25 - fix: use globalThis instead of window**

The SonarQube analysis no longer shows this issue in the codebase...
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 🔗 Vantaggi

✅ **Tracciabilità completa** - Vedi quale PR ha fixato l'issue  
✅ **Link diretto** - Click sul PR link per vedere i dettagli  
✅ **Titolo della PR** - Sai subito quale fix è stato applicato  
✅ **Automatico** - Niente da configurare manualmente  

## 📊 Quando Viene Aggiunto il Commento

Il commento viene aggiunto **solo se**:
1. ✅ È una PR (non un push diretto)
2. ✅ L'issue è stata effettivamente fixata su SonarQube
3. ✅ GitHub Actions riesce a recuperare le info della PR

Se non è una PR o manca un'info, il commento sarà comunque creato ma senza il riferimento alla PR.

## 🧪 Testing Locale

```bash
export GITHUB_TOKEN=your_token
export SONAR_TOKEN=your_sonar_token
export GITHUB_REPOSITORY=L9Lenny/lol-profile-editor

# Con informazioni PR (simula GitHub Actions):
export PR_NUMBER=25
export PR_URL="https://github.com/L9Lenny/lol-profile-editor/pull/25"
export PR_TITLE="fix: use globalThis instead of window"

node .github/scripts/auto-detect-fixed-issues.js
```

## 🎯 Output Script

```
🚀 Starting auto-detect fixed issues...

📦 Configuration:
   - GitHub Repository: L9Lenny/lol-profile-editor
   - SonarQube Project: L9Lenny_lol-profile-editor
   - PR Number: 25
   - PR URL: https://github.com/L9Lenny/lol-profile-editor/pull/25
   - PR Title: fix: use globalThis instead of window

📊 Analysis:
   - SonarQube issues: 20
   - GitHub issues: 25

🔍 Comparing issues...

⏭️  Issue #20: Still open in SonarQube
✅ Issue #42 (AZx-EEoAunfcaXKFAC4P): Fixed! Closing...
   ✅ Comment added (with PR reference)
   ✅ Issue closed

✨ Summary:
   - Closed: 1
   - Skipped: 24
```

## 📌 Commento Formato

Il commento include:
- ✅ Header "✅ Automatically Resolved"
- ✅ Spiegazione automatica
- ✅ SonarQube Key per tracciabilità
- ✅ **Link clickabile alla PR** (se disponibile)
- ✅ **Titolo della PR** (se disponibile)
- ✅ Spiegazione della risoluzione
- ✅ Footer con nota automatica

## ✨ Summary

**Prima**: Commentodell'issue non indicava quale PR l'ha fixata  
**Adesso**: Commento include link e titolo della PR che ha fixato il problema  
**Risultato**: Tracciabilità completa da issue → PR! 🎉
