(() => {
const $=id=>document.getElementById(id),esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let files=[];
function say(message,error=false){$("media-status").textContent=message;$("media-status").style.color=error?"#ff9fbd":"#9be6b3";}
function preview(file){const ext=file.name.split(".").pop().toLowerCase(),url=esc(file.url);if(/^(png|jpe?g|gif|webp|avif)$/.test(ext))return '<img src="'+url+'" alt="" loading="lazy">';if(/^(mp4|webm|mov)$/.test(ext))return '<video src="'+url+'" muted playsinline preload="metadata"></video>';if(/^(mp3|wav|ogg|m4a|flac)$/.test(ext))return "♫ AUDIO";if(ext==="pdf")return "PDF DOCUMENT";return "FILE";}
function render(){ $("media-count").textContent=files.length+" file"+(files.length===1?"":"s");$("media-grid").innerHTML=files.map((f,i)=>'<article class="media-card"><div class="media-thumb">'+preview(f)+'</div><div class="media-meta"><b>'+esc(f.name)+'</b><small>'+esc(f.path)+' · '+(f.size/1024).toFixed(1)+' KB</small><div class="media-actions"><button data-copy="'+i+'">Copy URL</button><button data-open="'+i+'">Open ↗</button></div></div></article>').join("")||'<div class="activity">No media uploaded yet. Add files to assets/media to see them here.</div>';
$("media-grid").querySelectorAll("[data-copy]").forEach(b=>b.addEventListener("click",async()=>{const f=files[Number(b.dataset.copy)];try{await navigator.clipboard.writeText(f.url);say("Copied "+f.name+" URL.");}catch{prompt("Copy this media URL:",f.url);}}));
$("media-grid").querySelectorAll("[data-open]").forEach(b=>b.addEventListener("click",()=>window.open(files[Number(b.dataset.open)].url,"_blank","noopener")));
}
async function refresh(){try{say("Loading repository media…");files=await OrbitGitHub.listMedia();render();say("Media library refreshed.");}catch(e){say(e.message,true);}}
async function upload(list){const selected=Array.from(list||[]);if(!selected.length)return;for(let i=0;i<selected.length;i++){const file=selected[i];say("Uploading "+(i+1)+"/"+selected.length+": "+file.name+"…");try{const saved=await OrbitGitHub.uploadMedia(file);say("Uploaded "+saved.name+" · commit "+String(saved.commit||"").slice(0,7));}catch(e){say(file.name+": "+e.message,true);}}$("media-files").value="";await refresh();}
$("media-files").addEventListener("change",e=>upload(e.target.files));
$("media-refresh").addEventListener("click",refresh);
const drop=$("media-drop");["dragenter","dragover"].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();drop.classList.add("dragover");}));["dragleave","drop"].forEach(name=>drop.addEventListener(name,e=>{e.preventDefault();drop.classList.remove("dragover");}));drop.addEventListener("drop",e=>upload(e.dataTransfer.files));
document.querySelector('[data-content-tab="media"]').addEventListener("click",()=>{if(OrbitGitHub.getConfig())refresh();});
window.addEventListener("orbit:config-imported",()=>{if(document.getElementById("content-media")&&!document.getElementById("content-media").hidden)refresh();});
window.OrbitMediaLibrary={refresh};
})();