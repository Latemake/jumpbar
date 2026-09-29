'use strict';
// Import the existing browser-local campaign when the player follows the old site's link.
if(location.hostname==='jumpbar.pages.dev'&&location.hash.startsWith('#save=')){
 try{const raw=decodeURIComponent(location.hash.slice(6));if(raw.length<24000&&!localStorage.getItem('jumpbar-campaign-v1')){const data=JSON.parse(atob(raw));localStorage.setItem('jumpbar-campaign-v1',JSON.stringify(new JumpbarCampaign(data).data));}}catch{}
 history.replaceState(null,'',location.pathname+location.search);
}
