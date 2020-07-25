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
import { WebmentionValidator } from "./modules/Validator/index.js";
import { Configuration } from "./modules/Configuration.js";

let currentFile;
let configuration;
const domParser = new DOMParser();
const validator = new WebmentionValidator({ domParser: domParser });

async function main() {
  // Load configuration from local storage and update configuration views
  configuration = new Configuration(window.localStorage, {
    darkMode: window.localStorage.getItem("darkMode"),
    endpoint: window.localStorage.getItem("endpoint"),
    isProfile: window.localStorage.getItem("isProfile"),
    driveURL: window.localStorage.getItem("driveURL")
  });
  await updateAllConfigurationViews();

  // Set event handlers for configuration interactions
  document.getElementById("config-endpoint").addEventListener("keyup", onEndpointChange);
  document.getElementById("config-drive-profile").addEventListener("click", onProfileButtonClick);
  document.getElementById("config-drive-drive").addEventListener("click", onDriveButtonClick);
  document.getElementById("app-settings").addEventListener("click", onConfigurationAnchorClick);
  document.getElementById("config-theme-light").addEventListener("click", onLightModeClick);
  document.getElementById("config-theme-dark").addEventListener("click", onDarkModeClick);

  // Set up loading the current page from the last attached pane
  let url = null;
  beaker.panes.setAttachable();
  let pane = await beaker.panes.attachToLastActivePane();
  if (pane) { url = pane.url; }
  beaker.panes.addEventListener("pane-navigated", e => {
    loadMentions(e.detail.url);
  });
  if (url) { loadMentions(url); }
}

async function updateAllConfigurationViews() {
  updateDarkModeView();
  updateEndpointView();
  await updateDriveView();
}

function onConfigurationAnchorClick() {
  const configPage = document.getElementById("config");
  if (configPage.classList.contains("hidden")) { configPage.classList.remove("hidden"); }
  else { configPage.classList.add("hidden"); }
}

function onLightModeClick() {
  configuration.darkMode = "false";
  updateDarkModeView();
}

function onDarkModeClick() {
  configuration.darkMode = "true";
  updateDarkModeView();
}

function updateDarkModeView() {
  if (configuration.darkMode === "true") {
    document.getElementById("config-theme-light").classList.remove("current");
    document.getElementById("config-theme-dark").classList.add("current");
  } else if (configuration.darkMode === "false") {
    document.getElementById("config-theme-light").classList.add("current");
    document.getElementById("config-theme-dark").classList.remove("current");
  }
}

async function onProfileButtonClick() {
  try {
    let profile = await beaker.contacts.requestProfile();
    configuration.isProfile = "true";
    configuration.driveURL = profile.url;
    await updateDriveView();
  } catch {}
}

async function onDriveButtonClick() {
  try {
    let drive = await beaker.shell.selectDriveDialog({
      writable: true
    });
    configuration.isProfile = "false";
    configuration.driveURL = drive;
    await updateDriveView();
  } catch {}
}

async function updateDriveView() {
  try {
    if (configuration.driveURL) {
      const driveInfo = await beaker.hyperdrive.getInfo(configuration.driveURL);
      document.getElementById("config-drive-info").textContent = driveInfo.title;
    }
    if (configuration.isProfile === "true") { 
      document.getElementById("config-drive-profile").classList.add("current");
      document.getElementById("config-drive-drive").classList.remove("current");
    } else if (configuration.isProfile === "false") {
      document.getElementById("config-drive-profile").classList.remove("current");
      document.getElementById("config-drive-drive").classList.add("current");
    }
  } catch {}
}

function onEndpointChange() {
  configuration.endpoint = document.getElementById("config-endpoint").value;
}

function updateEndpointView() {
  if (configuration.endpoint) { document.getElementById("config-endpoint").value = configuration.endpoint; }
}

function clearMentionContainer() {
  document.getElementById("mentions").textContent = "";
  document.getElementById("file-like-total").textContent = "0";
  document.getElementById("file-repost-total").textContent = "0";
}

async function loadMentions(url) {
  currentFile = new File({
    "url" : url,
    "validator" : validator,
    "domParser" : domParser
  });
  onLoadingMentions();
  await currentFile.init();
  getFileInformation(currentFile);
  if (!currentFile.endpoint) { onNoEndpoint(); }
  else if (!currentFile.mentions.length) { onNoReplies(); }
  else { onMentionsLoaded(); }
}

function onLoadingMentions() {
  document.getElementById("mentions").classList.add("hidden");
  document.getElementById("blank").classList.add("hidden");
  document.getElementById("no-endpoint").classList.add("hidden");
  document.getElementById("no-replies").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  clearMentionContainer();
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