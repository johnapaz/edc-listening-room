"use strict";
// Root (/) -> app, keeping the hash route so shared links like /#/artist/<id> open that page.
location.replace("/listening-room/" + location.hash);
