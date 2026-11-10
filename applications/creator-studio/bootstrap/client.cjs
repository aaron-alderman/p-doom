'use strict';
// Generic native browser host. Domain selection, edits, UI composition,
// persistence/replay and acceptance are exclusively admitted process queries.
async function start({model,data,manifest},modules){
  const {createKernel}=modules.seed;
  const state=new Map(),host={document,window,fetch,state,URL,Blob,setTimeout:window.setTimeout.bind(window),reportError:(error)=>{document.querySelector('[data-temple-errors]').textContent=String(error.message??error);}};
  let queue=Promise.resolve();
  const dispatch=(query,eventInput={})=>{
    const execution=queue.then(async()=>{
      let kernel;
      const available={...modules.value.valuePorts(),...modules.effects.computationalPorts(),...modules.effects.browserEffects(host,dispatch),...modules.browser.browserPorts(host,dispatch),...modules.bridge.kernelPorts(()=>kernel)};
      const ports=Object.fromEntries(manifest.grants.map(name=>{if(!Object.hasOwn(available,name))throw Error('Missing granted mechanism: '+name);return [name,available[name]];}));
      kernel=createKernel(ports,manifest.budget);
      const env={...data.bindings,model,data,eventInput};
      if(!Object.hasOwn(model.queries,query))throw Error('Unknown process entry');
      await kernel.run(model.queries[query],env);
      return env.result;
    });
    queue=execution.catch(()=>{});
    return execution;
  };
  // This is a local, explicit developer/agent surface, not a remote authenticated MCP server.
  window.usewords=Object.freeze({invoke:input=>dispatch(manifest.agentEntry,input)});
  await dispatch(manifest.entry);
}
module.exports={start};
