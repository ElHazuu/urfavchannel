from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
css='<link rel="stylesheet" href="video-gallery-v1.css" id="ckvg-styles">'
js='<script defer src="video-gallery-v1.js" id="ckvg-script"></script>'
anchor='      videoRows = data || [];\n      renderVideos();'
hook="""      videoRows = data || [];
      renderVideos();
      window.__ckGallerySnapshot = { videos: videoRows.filter(v => v.published), owner: videoOwner };
      window.dispatchEvent(new CustomEvent('ck:videos', { detail: window.__ckGallerySnapshot }));"""
if 'id="ckvg-styles"' not in s:
    if '</head>' not in s: raise RuntimeError('Missing </head>')
    s=s.replace('</head>',css+'\n</head>',1)
if 'id="ckvg-script"' not in s:
    if '</body>' not in s: raise RuntimeError('Missing </body>')
    s=s.replace('</body>',js+'\n</body>',1)
if 'window.__ckGallerySnapshot = { videos:' not in s:
    if anchor not in s: raise RuntimeError('Video loader layout changed: do not patch')
    s=s.replace(anchor,hook,1)
if 'window.__ckGallerySnapshot = { videos: [], owner: false' not in s:
    anchor2='        videoRows = [];\n        renderedPublishedSignature = null;'
    replacement2='        videoRows = [];\n        window.__ckGallerySnapshot = { videos: [], owner: false };\n        window.dispatchEvent(new CustomEvent(\'ck:videos\', { detail: window.__ckGallerySnapshot }));\n        renderedPublishedSignature = null;'
    if anchor2 not in s: raise RuntimeError('Logout video cleanup layout changed: do not patch')
    s=s.replace(anchor2,replacement2,1)
old='window.__ckGallerySnapshot = { videos: videoRows.filter(v => v.published), owner: videoOwner };'
new='window.__ckGallerySnapshot = { videos: videoRows.filter(v => v.published), owner: videoOwner, client: accountClient, user: accountUser };'
if old in s: s=s.replace(old,new,1)
elif new not in s: raise RuntimeError('Gallery data hook missing')
old_logout='window.__ckGallerySnapshot = { videos: [], owner: false };'
new_logout='window.__ckGallerySnapshot = { videos: [], owner: false, client: null, user: null };'
if old_logout in s: s=s.replace(old_logout,new_logout,1)
elif new_logout not in s: raise RuntimeError('Logout hook missing')
if 'id="ckstory-styles"' not in s:
    if '</head>' not in s: raise RuntimeError('Story styles: no head')
    s=s.replace('</head>','<link rel="stylesheet" id="ckstory-styles" href="story-gallery-v1.css">\n</head>',1)
if 'id="ckstory-script"' not in s:
    if '</body>' not in s: raise RuntimeError('Story script: no body')
    s=s.replace('</body>','<script defer id="ckstory-script" src="story-gallery-v1.js"></script>\n</body>',1)
# Upgrade the story album without touching the original interactive cards.
s=s.replace('href="story-gallery-v1.css"','href="story-gallery-v2.css"')
s=s.replace('src="story-gallery-v1.js"','src="story-gallery-v2.js"')
s=s.replace('href="story-gallery-v2.css"','href="story-gallery-v3.css"')
s=s.replace('src="story-gallery-v2.js"','src="story-gallery-v3.js"')
s=s.replace('href="story-gallery-v3.css"','href="story-gallery-v4.css"')
s=s.replace('src="story-gallery-v3.js"','src="story-gallery-v4.js"')
s=s.replace('href="story-gallery-v4.css"','href="story-gallery-v5.css"')
s=s.replace('src="story-gallery-v4.js"','src="story-gallery-v5.js"')
s=s.replace('href="story-gallery-v5.css"','href="story-gallery-v6.css"')
s=s.replace('src="story-gallery-v5.js"','src="story-gallery-v6.js"')
s=s.replace('href="story-gallery-v6.css"','href="story-gallery-v7.css"')
s=s.replace('src="story-gallery-v6.js"','src="story-gallery-v7.js"')
s=s.replace('href="story-gallery-v7.css"','href="story-gallery-v8.css"')
s=s.replace('src="story-gallery-v7.js"','src="story-gallery-v8.js"')
s=s.replace('href="story-gallery-v8.css"','href="story-gallery-v9.css"')
s=s.replace('src="story-gallery-v8.js"','src="story-gallery-v9.js"')
s=s.replace('href="story-gallery-v9.css"','href="story-gallery-v10.css"')
s=s.replace('src="story-gallery-v9.js"','src="story-gallery-v10.js"')
s=s.replace('href="story-gallery-v10.css"','href="story-gallery-v11.css"')
s=s.replace('src="story-gallery-v10.js"','src="story-gallery-v11.js"')
s=s.replace('href="story-gallery-v11.css"','href="story-gallery-v12.css"')

s=s.replace('href="story-gallery-v13.css"','href="story-gallery-v12.css"')
s=s.replace('href="story-gallery-v12.css"','href="story-gallery-v14.css"')
s=s.replace('src="story-gallery-v11.js"','src="story-gallery-v14.js"')
s=s.replace('href="story-gallery-v14.css"','href="story-gallery-v15.css"')
s=s.replace('src="story-gallery-v14.js"','src="story-gallery-v15.js"')
s=s.replace('href="story-gallery-v15.css"','href="story-gallery-v16.css"')
s=s.replace('src="story-gallery-v15.js"','src="story-gallery-v16.js"')
s=s.replace('href="story-gallery-v16.css"','href="story-gallery-v17.css"')
s=s.replace('href="story-gallery-v17.css"','href="story-gallery-v18.css"')
p.write_text(s,encoding='utf-8')
print('Gallery injection verified. Header CSS:',s.count('id="ckvg-styles"'),'JS:',s.count('id="ckvg-script"'),'video hook:',s.count('window.__ckGallerySnapshot = { videos: videoRows.filter'))
