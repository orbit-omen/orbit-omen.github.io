(() => {
  const $ = id => document.getElementById(id);
  let config = null;
  const fields = ["heroTitle","tagline","heroCta","heroCtaUrl","aboutHeading","aboutCopy","workHeading","servicesHeading","contactHeading","contactEmail","footer"];
  function set(path,value){config[path]=value;window.OrbitGitHub.setConfig(config);const name=$("preview-name");if(name)name.textContent=config.brand||config.name||"OrbitOmen";document.dispatchEvent(new CustomEvent("orbit:content-changed"));}
  function load(value){config=value;if(!config)return;fields.forEach(key=>{const el=document.querySelector('[data-home-field="'+key+'"]');if(el)el.value=config[key]??"";});}
  fields.forEach(key=>{const el=document.querySelector('[data-home-field="'+key+'"]');if(el)el.addEventListener("input",()=>{if(config)set(key,el.value);});});
  window.addEventListener("orbit:config-imported",()=>load(window.OrbitGitHub.getConfig()));
  document.querySelector('[data-content-tab="home"]')?.addEventListener("click",()=>{const c=window.OrbitGitHub.getConfig();if(c)load(c);});
  window.OrbitHomeEditor={load};
})();