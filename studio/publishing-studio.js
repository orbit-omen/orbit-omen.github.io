(() => {
const $=id=>document.getElementById(id);
let generated=[],configSha="",generatedConfig="",generatedBranch="";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safeBase=value=>{const u=new URL(value);if(u.protocol!=="https:"||u.username||u.password||u.search||u.hash)throw new Error("Use a clean HTTPS site URL without credentials, query strings or fragments.");u.pathname=u.pathname.replace(/\/+$/,"")+"/";return u.href;};
const safeImage=(value,base)=>{if(!value)return "";const u=new URL(value,base);if(u.protocol!=="https:")throw new Error("Article images must use HTTPS URLs or relative paths.");return u.href;};
function slug(value){return String(value||"").normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,70);}
function article(item,base){
 const title=esc(item.seoTitle||item.title||"Untitled"),description=esc(item.seoDescription||item.excerpt||""),canonical=base+"blog/"+slug(item.slug)+"/",image=safeImage(item.seoImage||item.cover||"",base);
 const body=String(item.body||"").split(/\n{2,}/).map(p=>"<p>"+esc(p).replace(/\n/g,"<br>")+"</p>").join("\n");
 const cover=image?'<img class="cover" src="'+esc(image)+'" alt="'+esc(item.title||"")+'">':"";
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+title+' — OrbitOmen</title><meta name="description" content="'+description+'"><link rel="canonical" href="'+canonical+'"><meta property="og:title" content="'+title+'"><meta property="og:description" content="'+description+'"><meta property="og:type" content="article">'+(image?'<meta property="og:image" content="'+esc(new URL(image,base).href)+'">':"")+'<link rel="stylesheet" href="../../assets/site.css"><style>.article{max-width:850px;margin:0 auto;padding:110px 7vw;min-height:75vh}.article h1{font-size:clamp(2.5rem,7vw,5rem);line-height:1.05}.article p{line-height:1.9;color:var(--muted)}.cover{width:100%;max-height:480px;object-fit:cover;border-radius:20px;margin:25px 0}.back{color:var(--pink)}</style></head><body><nav><a class="brand" href="../../">ORBIT<span>OMEN</span></a><div class="navlinks"><a href="../../">Home</a><a href="../">Journal</a></div><a class="studio-link" href="../../studio/">Studio ↗</a></nav><main class="article"><p class="tag">'+esc(item.category||item.type||"ARTICLE")+' · '+esc(item.date||"")+'</p><h1>'+title+'</h1><p>'+description+'</p>'+cover+'<div class="article-body">'+body+'</div><p><a class="back" href="../">← Back to journal</a></p></main><footer><a class="brand" href="../../">ORBIT<span>OMEN</span></a><span>© OrbitOmen</span></footer></body></html>';
}
function archive(posts,base){
 const cards=posts.map(p=>'<article class="project"><span class="tag">'+esc(p.category||p.type||"ARTICLE")+' · '+esc(p.date||"")+'</span><h2>'+esc(p.title||"Untitled")+'</h2><p>'+esc(p.excerpt||"")+'</p><a href="'+esc(slug(p.slug))+'/">Read article ↗</a></article>').join("");
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Journal — OrbitOmen</title><meta name="description" content="Projects, releases, ideas and updates from OrbitOmen."><link rel="canonical" href="'+base+'blog/"><link rel="stylesheet" href="../assets/site.css"></head><body><nav><a class="brand" href="../">ORBIT<span>OMEN</span></a><div class="navlinks"><a href="../">Home</a><a href="./">Journal</a></div><a class="studio-link" href="../studio/">Studio ↗</a></nav><main class="section" style="display:block;max-width:1100px;margin:auto;padding:110px 7vw;min-height:70vh"><p class="tag">ORBITOMEN JOURNAL</p><h1>Notes from OrbitOmen</h1><p>Projects, releases, ideas and updates.</p><div class="projects">'+cards+'</div></main><footer><a class="brand" href="../">ORBIT<span>OMEN</span></a><span>© OrbitOmen</span></footer></body></html>';
}
async function build(){
 const config=window.OrbitGitHub.getConfig();if(!config)throw new Error("Import your portfolio configuration first.");
 const base=safeBase($("generator-base-url").value.trim()||"https://orbit-omen.github.io/");
 const posts=(config.contentItems||[]).filter(p=>p&&(!p.status||p.status==="published")&&slug(p.slug)).sort((a,b)=>String(b.date||"").localeCompare(String(a.date||"")));
 const seen=new Set();for(const post of posts){const key=slug(post.slug);if(seen.has(key))throw new Error("Duplicate article URL slug: "+key+". Give each published article a unique slug.");seen.add(key);}
 if(config.seo?.noindex)throw new Error("Search indexing is disabled in SEO settings. Turn off noindex before generating a public sitemap.");
 const files=posts.map(p=>({path:"blog/"+slug(p.slug)+"/index.html",content:article(p,base)}));
 files.push({path:"blog/index.html",content:archive(posts,base)});
 const urls=[base,base+"blog/",...posts.map(p=>base+"blog/"+slug(p.slug)+"/"),...(config.pages||[]).filter(p=>slug(p.slug)).map(p=>base+"?page="+encodeURIComponent(p.slug))];
 files.push({path:"sitemap.xml",content:'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'+urls.map(u=>'<url><loc>'+esc(u)+'</loc></url>').join("\n")+'\n</urlset>\n'});
 files.push({path:"robots.txt",content:"User-agent: *\nAllow: /\nSitemap: "+base+"sitemap.xml\n"});
 files.push({path:"data/portfolio.json",content:JSON.stringify(config,null,2)+"\n"});
 const social=config.socialPreview||{};
 const pageResponse=await fetch("../index.html",{cache:"no-store"});
 if(!pageResponse.ok)throw new Error("Could not load the current homepage HTML for social metadata generation.");
 const pageParser=new DOMParser(),pageDoc=pageParser.parseFromString(await pageResponse.text(),"text/html");
 const putMeta=(key,value,property=false)=>{if(!value)return;const attr=property?"property":"name";let node=pageDoc.head.querySelector('meta['+attr+'="'+key+'"]');if(!node){node=pageDoc.createElement("meta");node.setAttribute(attr,key);pageDoc.head.append(node);}node.content=value;};
 const shareTitle=String(social.title||config.seo?.title||config.brand||config.name||"OrbitOmen").slice(0,120);
 const shareDescription=String(social.description||config.seo?.description||config.tagline||"").slice(0,300);
 const shareImage=social.image||config.seo?.image||"";
 pageDoc.title=shareTitle;
 putMeta("description",shareDescription);
 putMeta("og:site_name",config.brand||config.name||"OrbitOmen",true);
 putMeta("og:title",shareTitle,true);putMeta("og:description",shareDescription,true);putMeta("og:type","website",true);
 putMeta("twitter:card",shareImage?"summary_large_image":"summary");putMeta("twitter:title",shareTitle);putMeta("twitter:description",shareDescription);
 if(social.handle||config.seo?.twitter)putMeta("twitter:site",social.handle||config.seo.twitter);
 if(shareImage){const imageUrl=new URL(shareImage,base);if(imageUrl.protocol!=="https:")throw new Error("Social preview image must resolve to HTTPS.");putMeta("og:image",imageUrl.href,true);putMeta("twitter:image",imageUrl.href);}
 if(config.seo?.noindex)putMeta("robots","noindex, nofollow");
 const canonical=pageDoc.head.querySelector('link[rel="canonical"]')||pageDoc.head.appendChild(pageDoc.createElement("link"));canonical.rel="canonical";canonical.href=base;
 files.push({path:"index.html",content:"<!doctype html>\n"+pageDoc.documentElement.outerHTML});

 generated=files;configSha=window.OrbitGitHub.getImportedSha?.()||"";generatedConfig=JSON.stringify(config);generatedBranch=document.getElementById("branch").value.trim();
 const host=$("generator-files");host.innerHTML=files.map(f=>'<div class="blog-row"><div class="blog-row-main"><b>'+esc(f.path)+'</b><small>'+new Blob([f.content]).size.toLocaleString()+' bytes</small></div><span class="tag">GENERATED</span></div>').join("");
 $("generator-summary").textContent=files.length+" files ready · "+posts.length+" published articles · one atomic commit";
 $("generator-status").textContent="Preview generated. Nothing has been published yet.";
 $("generator-publish").disabled=false;
}
$("generator-preview").addEventListener("click",async()=>{try{$("generator-status").textContent="Generating static pages and social metadata…";await build();}catch(e){$("generator-status").textContent=e.message;$("generator-publish").disabled=true;}});
$("generator-publish").addEventListener("click",async()=>{
 if(!generated.length)return;
 const branch=document.getElementById("branch").value.trim();
 if(branch!==generatedBranch){$("generator-status").textContent="The selected branch changed after preview. Build a fresh preview.";return;}
 if(JSON.stringify(window.OrbitGitHub.getConfig())!==generatedConfig){$("generator-status").textContent="Your portfolio draft changed after preview. Rebuild the preview before publishing.";return;}
 if(window.OrbitGitHub.getImportedSha()!==configSha){$("generator-status").textContent="The imported configuration revision changed. Re-import and rebuild the preview.";return;}
 if(!confirm("Publish "+generated.length+" generated files to "+branch+" in one GitHub commit?"))return;
 $("generator-publish").disabled=true;$("generator-status").textContent="Publishing…";
 try{const result=await window.OrbitGitHub.publishFiles(generated,configSha,branch,$("generator-message").value.trim());$("generator-status").textContent="Published "+result.files+" files · "+result.commit.slice(0,7);$("generator-summary").textContent="Commit "+result.commit.slice(0,7)+" created successfully.";generated=[];$("generator-publish").disabled=true;}
 catch(e){$("generator-status").textContent="Publish stopped: "+e.message;$("generator-publish").disabled=false;}
});
$("generator-history").addEventListener("click",async()=>{const host=$("generator-history-list");host.textContent="Loading…";try{const rows=await window.OrbitGitHub.recentCommits(document.getElementById("branch").value.trim());host.innerHTML=rows.map(c=>'<div class="blog-row"><div class="blog-row-main"><b>'+esc(c.commit.message.split("\n")[0])+'</b><small>'+esc(c.commit.author?.date||"")+' · '+esc(c.sha.slice(0,7))+'</small></div><div class="blog-row-actions"><a target="_blank" rel="noopener" href="'+esc(c.html_url)+'">View commit ↗</a><button data-revert="'+esc(c.sha)+'">Revert changed files</button></div></div>').join("")||"No commits found.";
host.querySelectorAll("[data-revert]").forEach(button=>button.addEventListener("click",async()=>{const sha=button.dataset.revert;if(!confirm("Restore only the files changed by "+sha.slice(0,7)+" to their previous versions? Unrelated files are preserved."))return;button.disabled=true;try{const result=await window.OrbitGitHub.rollbackCommit(sha,document.getElementById("branch").value.trim());$("generator-status").textContent="Rollback committed · "+result.commit.slice(0,7);$("generator-history").click();}catch(error){button.disabled=false;$("generator-status").textContent="Rollback stopped: "+error.message;}}));}catch(e){host.textContent=e.message;}});
document.querySelector('[data-content-tab="publishing"]').addEventListener("click",()=>{if(window.OrbitGitHub.getConfig())$("generator-status").textContent="Ready to generate from the imported portfolio configuration.";});
window.addEventListener("orbit:config-imported",()=>{generated=[];$("generator-publish").disabled=true;$("generator-status").textContent="Configuration imported. Build a preview when ready.";});
})();