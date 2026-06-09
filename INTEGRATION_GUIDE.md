# Main Website Integration Guide

## 🔗 Connecting to Admin Panel Download Limits

This guide shows how to integrate the new download limit feature from the admin panel into the main website (College Predictor).

---

## Step 1: Get User's Download Limit

When a user tries to download something, first check if they have remaining downloads.

### Frontend (Client-side):
```javascript
async function checkDownloadLimit(userEmail) {
  try {
    // Verify email is authorized
    const verifyRes = await fetch('http://admin-panel:4000/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: userEmail })
    });
    
    const { authorized } = await verifyRes.json();
    if (!authorized) {
      alert('❌ Your email is not authorized to download');
      return false;
    }
    
    // Get user data from your database (should include downloadLimit)
    const userRes = await fetch(`/api/user/${userEmail}`);
    const user = await userRes.json();
    
    const limit = user.downloadLimit || 5; // default to 5
    const used = user.downloads || 0;
    
    if (used >= limit) {
      alert(`❌ Download limit exceeded!\nYou have used ${used}/${limit} downloads`);
      return false;
    }
    
    console.log(`✅ You can download. Used: ${used}/${limit}`);
    return true;
    
  } catch (error) {
    console.error('Error checking limit:', error);
    return false;
  }
}
```

---

## Step 2: Backend - Track Downloads

When a download is successful, increment the download counter.

### Backend (Node.js / Express example):
```javascript
app.post('/api/download', authenticateUser, async (req, res) => {
  try {
    const { email } = req.user;
    
    // Get user's current data
    const user = await db.collection('users').findOne({ email });
    const limit = user.downloadLimit || 5;
    const downloads = (user.downloads || 0) + 1;
    
    // Check if exceeds limit
    if (downloads > limit) {
      return res.status(403).json({
        error: 'Download limit exceeded',
        message: `You have reached your limit of ${limit} downloads`,
        current: downloads - 1,
        limit: limit
      });
    }
    
    // Perform the download
    const file = await getFileFromStorage(req.body.fileId);
    
    // Increment counter ONLY after successful download
    await db.collection('users').updateOne(
      { email },
      { $inc: { downloads: 1 } }
    );
    
    // Send file
    res.download(file.path);
    
    // Log download
    console.log(`✅ ${email} downloaded file. Count: ${downloads}/${limit}`);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## Step 3: Display Limit Info to User

Show the user their remaining downloads.

### Frontend - User Dashboard:
```html
<div class="download-status">
  <h3>📊 Your Download Status</h3>
  <div class="status-bar">
    <div class="progress" style="width: calc(var(--used) / var(--limit) * 100%)"></div>
  </div>
  <p id="download-count">
    <span id="used">3</span> / <span id="limit">5</span> downloads used
  </p>
  <button id="download-btn" onclick="downloadFile()">
    ⬇️ Download File
  </button>
</div>

<script>
async function updateDownloadStatus(email) {
  const res = await fetch(`/api/user/${email}`);
  const user = await res.json();
  
  document.getElementById('used').textContent = user.downloads || 0;
  document.getElementById('limit').textContent = user.downloadLimit || 5;
  
  const percentage = ((user.downloads || 0) / (user.downloadLimit || 5)) * 100;
  document.getElementById('download-count').style.setProperty('--used', user.downloads || 0);
  document.getElementById('download-count').style.setProperty('--limit', user.downloadLimit || 5);
  
  // Disable button if limit reached
  if ((user.downloads || 0) >= (user.downloadLimit || 5)) {
    document.getElementById('download-btn').disabled = true;
    document.getElementById('download-btn').textContent = '❌ Limit Reached';
  }
}

// Call this when page loads
window.onload = () => updateDownloadStatus(getCurrentUserEmail());
</script>
```

---

## Step 4: Update User Record with Limit from Admin Panel

Periodically sync download limit from admin panel.

### Backend - Sync Limits:
```javascript
// Run this when user logs in or periodically
async function syncDownloadLimitFromAdmin(email) {
  try {
    // Get limit from admin panel
    const adminRes = await fetch('http://admin-panel:4000/api/emails', {
      headers: { 'x-admin-password': process.env.ADMIN_PASSWORD }
    });
    
    const allEmails = await adminRes.json();
    const adminUser = allEmails.find(u => u.email === email);
    
    if (!adminUser) {
      console.warn(`Email ${email} not found in admin panel`);
      return null;
    }
    
    // Update our database with the limit from admin
    const updated = await db.collection('users').updateOne(
      { email },
      { 
        $set: { 
          downloadLimit: adminUser.downloadLimit || 5,
          downloads: adminUser.downloads || 0
        } 
      }
    );
    
    console.log(`✅ Synced limit for ${email}: ${adminUser.downloadLimit || 5}`);
    return adminUser.downloadLimit || 5;
    
  } catch (error) {
    console.error('Error syncing limit:', error);
    return null;
  }
}
```

---

## Database Schema for Main Website

Your users collection should have:
```javascript
{
  _id: ObjectId,
  email: "student@gmail.com",
  password: "hashed...",
  createdAt: Date,
  
  // ← Add these fields:
  downloads: 0,           // Number of files downloaded
  downloadLimit: 5,       // From admin panel (sync regularly)
  lastSyncLimit: Date     // When we last updated from admin
}
```

---

## Configuration

Set these environment variables in your main website:
```env
# Admin Panel Configuration
ADMIN_PANEL_URL=http://localhost:4000
ADMIN_PASSWORD=rising@admin2026

# Or for production:
ADMIN_PANEL_URL=https://admin.risingeducation.in
```

---

## Testing Checklist

- [ ] User can download when they have remaining downloads
- [ ] Download counter increments correctly
- [ ] User blocked when limit reached
- [ ] Admin can increase limit from admin panel
- [ ] Main website recognizes new limit after update
- [ ] Toast/notifications show download count
- [ ] Limits sync on user login
- [ ] Error handling if admin panel is down

---

## API Endpoints Summary

| Endpoint | Method | Purpose | Auth |
|----------|--------|---------|------|
| `/api/verify` | POST | Check if email authorized | ❌ Public |
| `/api/emails` | GET | Get all emails & limits | ✅ Admin |
| `/api/emails/:email/limit` | PATCH | Update download limit | ✅ Admin |
| `/api/download` | POST | Download file & track count | ✅ User |
| `/api/user/:email` | GET | Get user's download info | ✅ Authenticated |

---

## Troubleshooting

### Issue: "Download limit exceeded" when limit not reached
- **Solution:** Run sync job to update limit from admin panel

### Issue: Admin panel changes don't show on main website
- **Solution:** Implement auto-sync or manual sync button

### Issue: Admin panel not reachable
- **Solution:** Check firewall, CORS, and server status

---

## Example Complete Flow

```
1. User logs in
   ↓
2. Main website syncs downloadLimit from admin panel
   ↓
3. User clicks "Download"
   ↓
4. Frontend calls checkDownloadLimit()
   ↓
5. If limit OK: Backend increments counter and sends file
   ↓
6. If limit exceeded: Show error message
   ↓
7. Admin can increase limit from admin panel anytime
   ↓
8. Next time user syncs, they get new limit
```

