"use strict";
// Preserve shared root links while the app remains hosted under /listening-room/.
window.location.replace("/listening-room/" + window.location.search + window.location.hash);
