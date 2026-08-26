(()=>{
  const deferIframe=iframe=>{
    if(!iframe||iframe.dataset.deferred==='1')return;
    const src=iframe.getAttribute('src');
    if(!src)return;
    iframe.dataset.src=src;
    iframe.dataset.deferred='1';
    iframe.removeAttribute('src');
    iframe.setAttribute('title',iframe.getAttribute('title')||'Route preview');
    iframe.style.background='linear-gradient(135deg,#f7faf8,#eef4f1)';
  };

  const loadActiveDayMaps=()=>{
    const active=document.querySelector('.day.active');
    if(!active)return;
    active.querySelectorAll('iframe[data-src]').forEach((iframe,index)=>{
      if(iframe.src)return;
      const load=()=>{
        if(!iframe.isConnected||!iframe.closest('.day.active'))return;
        iframe.src=iframe.dataset.src;
        iframe.removeAttribute('data-src');
      };
      if('requestIdleCallback' in window)requestIdleCallback(load,{timeout:900+index*250});
      else setTimeout(load,180+index*180);
    });
  };

  const scan=root=>{
    if(root?.matches?.('.trip-map-card iframe'))deferIframe(root);
    root?.querySelectorAll?.('.trip-map-card iframe').forEach(deferIframe);
    loadActiveDayMaps();
  };

  const observer=new MutationObserver(records=>{
    for(const record of records){
      if(record.type==='childList')record.addedNodes.forEach(node=>node.nodeType===1&&scan(node));
      if(record.type==='attributes'&&record.target.classList?.contains('day'))loadActiveDayMaps();
    }
  });

  const start=()=>{
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class']});
    scan(document.body);
    document.addEventListener('click',event=>{
      if(event.target.closest('#nav .pill,.story-card,.day-control,.game-jump'))setTimeout(loadActiveDayMaps,40);
    },true);
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
