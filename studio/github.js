/* GitHub API bridge. Token is held in memory only. */
(() => {
  const API="https://api.github.com",REPO="orbit-omen/orbit-omen.github.io";
  let token="",repo=null,importedSha="",importedBranch="",currentConfig=null;
  const headers=()=>({Accept:"application/vnd.github+json",Authorization:"Bearer "+token,"X-GitHub-Api-Version":"2022-11-28"});
  async function request(path,options={}){const res=await fetch(API+path,{...options,headers:{...headers(),...(options.headers||{})}});const body=await res.json().catch(()=>({}));if(!res.ok)throw new Error(body.message||("GitHub API error "+res.status));return body;}
  function encodeUtf8Base64(value){const bytes=new TextEncoder().encode(value);let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);}
  function decodeUtf8Base64(value){const binary=atob(value.replace(/\n/g,""));return new TextDecoder().decode(Uint8Array.from(binary,c=>c.charCodeAt(0)));}
  const short=s=>s?s.slice(0,7):"—", $=id=>document.getElementById(id);
  function status(connected){$("connection-state").classList.toggle("connected",connected);$("connection-state").innerHTML=connected?"<i></i> GITHUB CONNECTED":"<i></i> NOT CONNECTED";$("stat-repo").textContent=connected?REPO:"Not connected";$("disconnect").hidden=!connected;$("import").disabled=!connected;$("branch").disabled=!connected;$("commit-message").disabled=!connected;}
  function activity(message){$("activity").textContent=message;}
  function feedback(id,message,error=false){const el=$(id);el.textContent=message;el.style.color=error?"#ff9fbd":"#9be6b3";}
  async function connect(value){token=value.trim();if(!token)throw new Error("Paste a GitHub fine-grained token first.");const r=await request("/repos/"+REPO);if(!r.permissions?.push)throw new Error("This GitHub account does not have push access to the target repository.");repo=r;$("default-branch").textContent=r.default_branch;$("branch").value=r.default_branch;status(true);feedback("auth-feedback","Repository access verified. Connected to "+REPO+".");activity("Connected to GitHub repository "+REPO+".");$("publish-top").disabled=!currentConfig;return r;}
  async function importConfig(){if(!token||!repo)throw new Error("Connect GitHub before importing.");const branch=$("branch").value.trim()||repo.default_branch;const file=await request("/repos/"+REPO+"/contents/data/portfolio.json?ref="+encodeURIComponent(branch));if(file.type!=="file"||!file.content)throw new Error("data/portfolio.json was not returned as a text file.");const parsed=JSON.parse(decodeUtf8Base64(file.content));currentConfig=parsed;importedSha=file.sha;importedBranch=branch;$("json-editor").value=JSON.stringify(parsed,null,2);$("json-editor").disabled=false;$("save-local").disabled=false;$("file-badge").textContent="IMPORTED";$("import-sha").textContent=short(file.sha);$("stat-content").textContent="Imported";$("stat-status").textContent="Clean";$("validation-state").textContent="Valid JSON · imported from "+branch;$("editor-path").textContent="data/portfolio.json · "+branch;$("publish").disabled=false;$("publish-top").disabled=false;feedback("auth-feedback","Imported data/portfolio.json from "+branch+".");activity("Imported portfolio configuration from "+branch+" ("+short(file.sha)+").");window.dispatchEvent(new CustomEvent("orbit:config-imported"));return parsed;}
  function validate(){try{const parsed=JSON.parse($("json-editor").value);if(currentConfig&&typeof currentConfig==="object"&&!Array.isArray(currentConfig)&&parsed&&typeof parsed==="object"&&!Array.isArray(parsed)){Object.keys(currentConfig).forEach(k=>delete currentConfig[k]);Object.assign(currentConfig,parsed);}else currentConfig=parsed;$("validation-state").textContent="Valid JSON";$("stat-status").textContent="Ready to publish";return true;}catch(e){$("validation-state").textContent="JSON error: "+e.message;$("stat-status").textContent="Invalid JSON";return false;}}
  function saveLocal(){if(!validate())return false;localStorage.setItem("orbit-studio-draft",JSON.stringify(currentConfig));$("stat-status").textContent="Draft saved";activity("Saved a local browser draft. No GitHub files changed.");return true;}
  async function publish(){if(!token||!repo)throw new Error("Connect GitHub first.");if(!validate())throw new Error("Fix the JSON validation error before publishing.");if(!importedSha)throw new Error("Import the current repository file before publishing.");const branch=$("branch").value.trim()||repo.default_branch;if(branch!==importedBranch)throw new Error("The selected branch differs from the imported branch. Import that branch first.");const latest=await request("/repos/"+REPO+"/contents/data/portfolio.json?ref="+encodeURIComponent(branch));if(latest.sha!==importedSha)throw new Error("The remote file changed since import. Import the latest version and re-apply your edits to avoid overwriting someone else's work.");const message=$("commit-message").value.trim()||"Update OrbitOmen portfolio content";const body=JSON.stringify(currentConfig,null,2)+"\n";const saved=await request("/repos/"+REPO+"/contents/data/portfolio.json",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,content:encodeUtf8Base64(body),sha:importedSha,branch})});importedSha=saved.content.sha;$("import-sha").textContent=short(importedSha);$("stat-status").textContent="Published";$("validation-state").textContent="Published successfully · "+short(saved.commit.sha);$("publish").disabled=true;$("publish-top").disabled=true;activity("Published data/portfolio.json to "+branch+" · commit "+short(saved.commit.sha)+".");return saved;}
  function requireMediaAccess(){if(!token||!repo)throw new Error("Connect GitHub before using the Media Library.");return $("branch").value.trim()||repo.default_branch;}
  async function listMedia(){const branch=requireMediaAccess();let items;try{items=await request("/repos/"+REPO+"/contents/assets/media?ref="+encodeURIComponent(branch));}catch(e){if(/404|Not Found/i.test(e.message))return [];throw e;}if(!Array.isArray(items))return [];return items.filter(x=>x.type==="file").map(x=>({name:x.name,path:x.path,size:x.size,url:x.download_url||"",sha:x.sha})).sort((a,b)=>a.name.localeCompare(b.name));}
  async function uploadMedia(file){const branch=requireMediaAccess();if(!(file instanceof File))throw new Error("Choose a valid file.");if(file.size>20*1024*1024)throw new Error(file.name+" is larger than the 20 MB per-file Studio limit.");if(file.size===0)throw new Error(file.name+" is empty.");const ext=file.name.split(".").pop().toLowerCase();if(["html","htm","xhtml","js","mjs","cjs","svg","xml","xsl","mhtml","hta"].includes(ext))throw new Error("This file type can execute active content and is blocked from the public media folder.");const clean=file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g,"-").replace(/^-+|-+$/g,"").slice(-100)||"upload.bin";const stamp=Date.now().toString(36);const path="assets/media/"+stamp+"-"+clean;const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));const content=btoa(binary);const saved=await request("/repos/"+REPO+"/contents/"+path.split("/").map(encodeURIComponent).join("/") ,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Add media: "+clean,content,branch})});return {name:clean,path,url:saved.content?.download_url||("https://raw.githubusercontent.com/"+REPO+"/"+encodeURIComponent(branch)+"/"+path),size:file.size,sha:saved.content?.sha,commit:saved.commit?.sha};}
  async function publishFiles(files,expectedSha,branch,message){
    if(!token||!repo)throw new Error("Connect GitHub first.");
    if(!Array.isArray(files)||!files.length)throw new Error("There are no generated files to publish.");
    if(branch!==importedBranch)throw new Error("Import the selected branch before publishing.");
    const latest=await request("/repos/"+REPO+"/contents/data/portfolio.json?ref="+encodeURIComponent(branch));
    if(latest.sha!==expectedSha||latest.sha!==importedSha)throw new Error("The remote portfolio configuration changed. Re-import before publishing.");
    const ref=await request("/repos/"+REPO+"/git/ref/heads/"+encodeURIComponent(branch));
    const parent=ref.object.sha;
    const parentCommit=await request("/repos/"+REPO+"/git/commits/"+parent);
    const blobs=[];
    for(const file of files){
      if(!file.path||file.path.startsWith("/")||file.path.split("/").includes(".."))throw new Error("Unsafe generated file path: "+file.path);
      const blob=await request("/repos/"+REPO+"/git/blobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({content:file.content,encoding:"utf-8"})});
      blobs.push({path:file.path,mode:"100644",type:"blob",sha:blob.sha});
    }
    const tree=await request("/repos/"+REPO+"/git/trees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base_tree:parentCommit.tree.sha,tree:blobs})});
    const commit=await request("/repos/"+REPO+"/git/commits",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:message||"Publish OrbitOmen website",tree:tree.sha,parents:[parent]})});
    await request("/repos/"+REPO+"/git/refs/heads/"+encodeURIComponent(branch),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({sha:commit.sha,force:false})});
    const refreshed=await request("/repos/"+REPO+"/contents/data/portfolio.json?ref="+encodeURIComponent(branch));
    importedSha=refreshed.sha;$("import-sha").textContent=short(importedSha);$("stat-status").textContent="Published";activity("Published "+files.length+" files in one commit · "+short(commit.sha)+".");
    return {commit:commit.sha,files:files.length};
  }
  async function recentCommits(branch){const b=branch||importedBranch;if(!b)throw new Error("Import a branch first.");return request("/repos/"+REPO+"/commits?sha="+encodeURIComponent(b)+"&per_page=12");}

  async function rollbackCommit(commitSha,branch){
    const b=branch||importedBranch;
    if(!token||!repo)throw new Error("Connect GitHub first.");
    if(!b||b!==importedBranch)throw new Error("Import the branch you want to roll back first.");
    const target=await request("/repos/"+REPO+"/commits/"+commitSha);
    if(!target.parents?.length)throw new Error("This commit has no parent to restore from.");
    const previous=await request("/repos/"+REPO+"/git/commits/"+target.parents[0].sha);
    const oldTree=await request("/repos/"+REPO+"/git/trees/"+previous.tree.sha+"?recursive=1");
    const oldEntries=new Map((oldTree.tree||[]).map(x=>[x.path,x]));
    const changed=(target.files||[]).map(file=>{const old=oldEntries.get(file.filename);return old?{path:file.filename,mode:old.mode,type:old.type,sha:old.sha}:{path:file.filename,mode:"100644",type:"blob",sha:null};});
    if(!changed.length)throw new Error("GitHub returned no changed files for this commit.");
    const ref=await request("/repos/"+REPO+"/git/ref/heads/"+encodeURIComponent(b));
    const current=await request("/repos/"+REPO+"/git/commits/"+ref.object.sha);
    const tree=await request("/repos/"+REPO+"/git/trees",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({base_tree:current.tree.sha,tree:changed})});
    const commit=await request("/repos/"+REPO+"/git/commits",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:"Revert publication "+commitSha.slice(0,7),tree:tree.sha,parents:[ref.object.sha]})});
    await request("/repos/"+REPO+"/git/refs/heads/"+encodeURIComponent(b),{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({sha:commit.sha,force:false})});
    const configFile=await request("/repos/"+REPO+"/contents/data/portfolio.json?ref="+encodeURIComponent(b));importedSha=configFile.sha;$("import-sha").textContent=short(importedSha);
    activity("Reverted "+changed.length+" files from commit "+short(commitSha)+". New commit "+short(commit.sha)+".");
    return {commit:commit.sha,files:changed.length};
  }
  function disconnect(){token="";repo=null;importedSha="";importedBranch="";status(false);$("token").value="";$("json-editor").disabled=true;$("publish").disabled=true;$("publish-top").disabled=true;$("save-local").disabled=true;$("stat-content").textContent="Not imported";$("stat-status").textContent="No changes";$("file-badge").textContent="NOT IMPORTED";feedback("auth-feedback","Disconnected. The token has been cleared from memory.");activity("GitHub disconnected.");}
  window.OrbitGitHub={connect,importConfig,validate,saveLocal,publish,publishFiles,recentCommits,rollbackCommit,listMedia,uploadMedia,disconnect,getConfig:()=>currentConfig,getImportedSha:()=>importedSha,setConfig(value){currentConfig=value;$('json-editor').value=JSON.stringify(value,null,2);$("validation-state").textContent="Valid JSON · unsaved edits";$("stat-status").textContent="Unsaved edits";$("publish").disabled=false;$("publish-top").disabled=false;return true;}};
})();