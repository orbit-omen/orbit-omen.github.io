const $ = id => document.getElementById(id);
const views=["overview","content","github"];
const titles={overview:["Overview","Your website workspace, repository connection and publishing status."],content:["Content studio","Manage your profile, projects, services, updates, links and theme."],github:["GitHub sync","Connect, import, compare and publish repository content."]};
function toast(message){const n=document.createElement("div");n.className="notice";n.textContent=message;$("notice").hidden=false;$("notice").replaceWith(n);n.id="notice";setTimeout(()=>{n.hidden=true},3500)}
function openView(name){views.forEach(v=>$("view-"+v).hidden=v!==name);document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===name));$("page-title").textContent=titles[name][0];$("page-subtitle").textContent=titles[name][1]}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.view)));
document.querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>openView(b.dataset.open)));
$("connect").addEventListener("click",async()=>{const b=$("connect");b.disabled=true;b.textContent="Connecting…";try{await OrbitGitHub.connect($("token").value);$("token").value="";b.textContent="Connected";}catch(e){$("auth-feedback").textContent=e.message;$("auth-feedback").style.color="#ff9fbd";b.textContent="Connect & inspect repository";}finally{b.disabled=false;}});
$("disconnect").addEventListener("click",()=>OrbitGitHub.disconnect());
$("import").addEventListener("click",async()=>{const b=$("import");b.disabled=true;b.textContent="Importing…";try{await OrbitGitHub.importConfig();openView("content");toast("Repository settings imported successfully.");}catch(e){$("auth-feedback").textContent=e.message;$("auth-feedback").style.color="#ff9fbd";}finally{b.disabled=false;b.textContent="Import latest settings";}});
$("format-json").addEventListener("click",()=>{try{$("json-editor").value=JSON.stringify(JSON.parse($("json-editor").value),null,2);OrbitGitHub.validate();}catch(e){$("validation-state").textContent="JSON error: "+e.message;}});
$("validate-json").addEventListener("click",()=>{if(OrbitGitHub.validate())toast("JSON is valid.");});
$("json-editor").addEventListener("input",()=>{$("stat-status").textContent="Unsaved edits";$("publish").disabled=false;$("publish-top").disabled=false;});
window.addEventListener("orbit:config-imported",()=>window.OrbitContentManager?.load(OrbitGitHub.getConfig()));
$("save-local").addEventListener("click",()=>{if(OrbitGitHub.saveLocal())toast("Draft saved in this browser.");});
async function publish(){if(!confirm("Publish data/portfolio.json to the selected GitHub branch? This creates a commit in the repository."))return;const buttons=[$("publish"),$("publish-top")];buttons.forEach(b=>{b.disabled=true;b.textContent="Publishing…";});try{const r=await OrbitGitHub.publish();toast("Published successfully · "+r.commit.sha.slice(0,7));}catch(e){$("publish-feedback").textContent=e.message;$("publish-feedback").style.color="#ff9fbd";toast("Publish stopped: "+e.message);}finally{buttons.forEach(b=>{b.textContent="Publish changes ↗";b.disabled=false;});}}
$("publish").addEventListener("click",publish);$("publish-top").addEventListener("click",publish);
openView("overview");