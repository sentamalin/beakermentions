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
let currentFile;

async function main() {
  let params = new URLSearchParams(document.location.search.substring(1));
  if (params.get("url")) {
    currentFile = new File({
      "url" : params.get("url")
    });
    onLoadingMentions();
    await currentFile.init();
    getFileInformation(currentFile);
    if (!currentFile.endpoint) { onNoEndpoint(); }
    else if (!currentFile.mentions.length) { onNoReplies(); }
    else { onMentionsLoaded(); }
  }
}

function onLoadingMentions() {
  document.getElementById("blank").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
}

function onMentionsLoaded() {
  appendMentions(currentFile, document.querySelector("#mentions"), document.querySelector("#mention-template"))
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("mentions").classList.remove("hidden");
}

function onNoEndpoint() {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("no-endpoint").classList.remove("hidden");
}

function onNoReplies() {
  document.getElementById("loading").classList.add("hidden");
  document.getElementById("no-replies").classList.remove("hidden");
}

function getFileInformation(file) {
  document.querySelector("#file-meta > .file-url > h1").textContent = file.author;
  document.querySelector("#file-meta > .file-url").setAttribute("href", file.url);
  document.querySelector("#file-meta > .drive-thumb").setAttribute("src", file.thumb);
  document.getElementById("file-like-total").textContent = file.totalLikes;
  document.getElementById("file-repost-total").textContent = file.totalReposts;
}

function appendMentions(file, container, template) {
  for(let i = 0; i < file.mentions.length; i++) {
    if (file.mentions[i].isAReply) {
      let clone = template.content.cloneNode(true);

      clone.querySelector(".mention-url > h1").textContent = file.mentions[i].author;
      clone.querySelector(".mention-meta > img").setAttribute("src", file.mentions[i].thumb);
      clone.querySelector(".mention-like-total").textContent = file.mentions[i].totalLikes;
      clone.querySelector(".mention-repost-total").textContent = file.mentions[i].totalReposts;
      clone.querySelector(".mention-url").setAttribute("href", file.mentions[i].url);

      switch (file.mentions[i].content.type) {
        case "text":
          clone.querySelector(".mention-content").innerHTML = `<p>${file.mentions[i].content.content}</p>`;
          break;
        case "html":
          clone.querySelector(".mention-content").innerHTML = file.mentions[i].content.content;
          break;
        case "image":
          clone.querySelector(".mention-content").innerHTML = `<img src="${file.mentions[i].content.url}" loading="lazy" />`;
          clone.querySelector(".mention-content").classList.add("visual-media");
          clone.querySelector("footer").classList.add("visual-media");
          break;
        case "file":
          clone.querySelector(".mention-content").innerHTML = `<p>Linked a <a href="${file.mentions[i].content.url}">file</a>.</p>`;
          break;
      }

      appendMentions(file.mentions[i], clone.querySelector(".nested-mentions"), template);
      container.appendChild(clone);
    }
  }
}

main();