(() => {
  const $ = id => document.getElementById(id);
  let config = null;
  const fields = ["heroTitle","tagline","heroCta","heroCtaUrl","aboutHeading","aboutCopy","workHeading","servicesHeading","contactHeading","contactEmail","footer"];
  function set(path,value){if(path==="aboutCopy"){config.about=config.about||{};config.about.text=value;}else config[path]=value;window.OrbitGitHub.setConfig(config);window.OrbitContentManager?.refresh();document.dispatchEvent(new CustomEvent("orbit:content-changed"));}
  function load(value){config=window.OrbitContentManager?.getConfig()||value;if(!config)return;fields.forEach(key=>{const el=document.querySelector('[data-home-field="'+key+'"]');if(el)el.value=key==="aboutCopy"?(config.about?.text??config.aboutCopy??""):(config[key]??"");});}
  fields.forEach(key=>{const el=document.querySelector('[data-home-field="'+key+'"]');if(el)el.addEventListener("input",()=>{if(config)set(key,el.value);});});
  window.addEventListener("orbit:config-imported",()=>load(window.OrbitGitHub.getConfig()));
  document.querySelector('[data-content-tab="home"]')?.addEventListener("click",()=>{const c=window.OrbitGitHub.getConfig();if(c)load(c);});
  window.OrbitHomeEditor={load};
})();