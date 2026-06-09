# GitHub Deploy करने के Steps

## 1️⃣ पहले Git Setup करो

```bash
# Check if git is initialized
cd c:\Users\soham\Downloads\admin-panel
git status
```

अगर `.git` folder नहीं है तो:
```bash
git init
```

---

## 2️⃣ GitHub पर नया Repository Create करो

1. https://github.com/new खोलो
2. Repository name दो (जैसे: `rising-admin-panel`)
3. **Private** या **Public** select करो
4. "Create repository" क्लिक करो
5. URL copy करो (जैसे: `https://github.com/YOUR-USERNAME/rising-admin-panel.git`)

---

## 3️⃣ Local Repository को GitHub से Connect करो

```bash
# Terminal खोलो (admin-panel folder में)
cd c:\Users\soham\Downloads\admin-panel

# Remote add करो (paste अपना GitHub URL)
git remote add origin https://github.com/YOUR-USERNAME/rising-admin-panel.git

# Verify
git remote -v
```

---

## 4️⃣ Files को Stage करो

```bash
# सभी changes add करो
git add .

# Check करो क्या add हुआ
git status
```

---

## 5️⃣ Commit करो

```bash
git commit -m "Initial commit: Admin panel with download limits feature"
```

या detailed message:
```bash
git commit -m "feat: Add download limit management system

- New PATCH endpoint for updating download limits
- Admin UI with inline limit editing
- Real-time updates to MongoDB
- Toast notifications for user feedback"
```

---

## 6️⃣ Push करो GitHub पर

```bash
# First time (set upstream)
git branch -M main
git push -u origin main

# अगली बार सिर्फ:
git push
```

---

## 7️⃣ GitHub पर Create करना (.env को छुपाना)

`.gitignore` file बना ये:

```bash
# अगर .gitignore नहीं है तो बना:
```

File: `.gitignore`
```
node_modules/
.env
.env.local
.env.*.local
*.log
.DS_Store
```

फिर:
```bash
git add .gitignore
git commit -m "Add gitignore to exclude sensitive files"
git push
```

---

## 📋 Complete Command Sequence

```bash
cd c:\Users\soham\Downloads\admin-panel

# 1. Initialize (अगर नहीं है)
git init

# 2. Add remote
git remote add origin https://github.com/YOUR-USERNAME/rising-admin-panel.git

# 3. Add all files
git add .

# 4. Commit
git commit -m "Initial commit with download limit feature"

# 5. Set branch and push
git branch -M main
git push -u origin main
```

---

## ✅ Verify करो GitHub पर

1. https://github.com/YOUR-USERNAME/rising-admin-panel खोलो
2. सभी files दिख रहे हैं?
3. README.md दिख रहा है?

---

## 📝 README.md Add करो

File बनाओ: `README.md`

```markdown
# Rising Education Admin Panel

Admin panel for managing College Predictor access with download limits.

## Features

- ✅ Manage authorized emails
- ✅ Set/update download limits per user
- ✅ Real-time MongoDB integration
- ✅ Admin authentication
- ✅ Download tracking

## Installation

```bash
npm install
```

## Setup

1. Create `.env`:
```
MONGODB_URI=your_mongodb_uri
ADMIN_PASSWORD=your_password
PORT=4000
```

2. Start server:
```bash
npm start
```

3. Open: http://localhost:4000

## API Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/api/emails` | ✅ | Get all authorized emails |
| POST | `/api/emails` | ✅ | Add email access |
| DELETE | `/api/emails/:email` | ✅ | Remove email |
| PATCH | `/api/emails/:email/limit` | ✅ | Update download limit |
| POST | `/api/verify` | ❌ | Verify email |

## Integration

See [INTEGRATION_GUIDE.md](./INTEGRATION_GUIDE.md) for main website integration.
```

फिर:
```bash
git add README.md
git commit -m "Add README documentation"
git push
```

---

## 🔧 Future Updates के लिए

बार-बार करना:
```bash
# Changes करने के बाद:
git add .
git commit -m "Description of changes"
git push
```

---

## 🚀 Production Deploy (Render/Heroku पर)

### Option 1: Render पर Deploy करो

1. https://render.com खोलो
2. "New +" → "Web Service"
3. GitHub repo select करो
4. Environment variables set करो:
   - `MONGODB_URI`
   - `ADMIN_PASSWORD`
   - `PORT`
5. "Deploy" क्लिक करो

### Option 2: Heroku पर Deploy करो

```bash
# 1. Heroku login करो (अगर नहीं किया)
heroku login

# 2. App create करो
heroku create rising-admin-panel

# 3. Environment variables set करो
heroku config:set MONGODB_URI="your_uri"
heroku config:set ADMIN_PASSWORD="your_password"

# 4. Push करो
git push heroku main

# 5. Open करो
heroku open
```

---

## 🔐 Important - .env को Safe रखो

❌ **GitHub पर .env upload न करो!**

```bash
# .env file को remove करो अगर accidentally pushed हो
git rm --cached .env
git commit -m "Remove .env from tracking"
git push
```

---

## ✔️ Checklist

- [ ] GitHub account बना लिया?
- [ ] Repository create किया?
- [ ] Git initialized है?
- [ ] Remote add किया?
- [ ] .gitignore बनाया?
- [ ] Changes commit किए?
- [ ] Push किया?
- [ ] GitHub पर files दिख रहे हैं?
- [ ] README.md है?
- [ ] Production ready है?

---

## 📞 Quick Reference

```bash
# Setup (एक बार)
git init
git remote add origin YOUR_REPO_URL
git add .
git commit -m "Initial commit"
git push -u origin main

# Updates (हर बार)
git add .
git commit -m "Your message"
git push

# Check status
git status

# See history
git log --oneline

# Undo changes
git restore FILE_NAME
```

Done! अब तुम्हारा admin panel GitHub पर है! 🎉
