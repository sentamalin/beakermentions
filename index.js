// Beakermentions (index.js) - Read and send responses on what you're
// currently viewing on Beaker Browser.
// 
// Written in 2020 by Don Geronimo <email@sentamal.in>
//
// To the extent possible under law, the author(s) have dedicated all copyright
// and related and neighboring rights to this software to the public domain
// worldwide. This software is distributed without any warranty.
// 
// You should have received a copy of the CC0 Public Domain Dedication along
// with this software. If not, see <http://creativecommons.org/publicdomain/zero/1.0/>.

import { File } from "./modules/File.js";

class Beakermentions {
}

async function main() {
  let testFile = new File({
    "url" : "hyper://be127cc55e7e872f6be870ab0fa631be431f3917aa4dc7d5d23ea46287d986fc/testMentions/mainPost.md"
  });
  await testFile.init();
  console.log("Test File -", testFile);
}

main();