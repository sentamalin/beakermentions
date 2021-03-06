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
import * as WindowMessages from "./modules/WindowMessages.js";

let currentFile;
let configuration;
// Disabled as Iframe window messaging is currently not working
// const endpointIframe = document.getElementById("endpoint-iframe").contentWindow;
let endpointURL;
let endpointReady;
let targetURL;
let paneURL = null;
let pendingURL = null;
const domParser = new DOMParser();
const validator = new WebmentionValidator({ domParser: domParser });

async function main() {
  // Load configuration from local storage and update configuration views
  configuration = new Configuration(window.localStorage, {
    darkMode: window.localStorage.getItem("darkMode"),
    endpoint: window.localStorage.getItem("endpoint"),
    isProfile: window.localStorage.getItem("isProfile"),
    driveURL: window.localStorage.getItem("driveURL"),
    useWindowMessage: window.localStorage.getItem("useWindowMessage")
  });
  updateAllConfigurationViews();

  // Set event handlers for configuration changes
  configuration.onDarkModeSet(response => { updateDarkModeView(response); });
  configuration.onEndpointSet(response => { updateEndpointView(response); });
  configuration.onIsProfileSet(response => { updateDriveButtonView(response); });
  configuration.onDriveURLSet(response => { updateDriveInfoView(response); });

  // Set event handlers for configuration view interactions
  document.getElementById("config-endpoint").addEventListener("keyup", onEndpointChange);
  document.getElementById("config-drive-profile").addEventListener("click", onProfileButtonClick);
  document.getElementById("config-drive-drive").addEventListener("click", onDriveButtonClick);
  document.getElementById("app-settings").addEventListener("click", onConfigurationAnchorClick);
  document.getElementById("config-theme-light").addEventListener("click", onLightModeClick);
  document.getElementById("config-theme-dark").addEventListener("click", onDarkModeClick);

  // Set event handlers for <iframe> messages
  window.addEventListener("message", async event => {
    const message = JSON.parse(event.data);

    // Verify that the event's origin is the endpoint that you expect before doing anything
    if (event.origin === endpointURL.origin) {
      switch (message.type) {
        case "handshake":
          endpointIframe.postMessage(JSON.stringify(WindowMessages.sendOrigin()), endpointURL.origin);
          console.debug("Handshake Received:", message);
          break;
        case "ready":
          if (message.origin === location.origin) {
            isEndpointReady(true);
            console.debug("Ready Received:", message);
            console.debug("Endpoint Ready is:", endpointReady);
          }
          break;
        case "webmentions":
          console.debug("Webmentions Received:", message);
          break;
        case "success":
          pendingURL = null;
          loadMentions(paneURL);
          console.debug("Success Received:", message);
          break;
        case "failure":
          if (pendingURL) {
            await beaker.hyperdrive.unlink(pendingURL);
            pendingURL = null;
          }
          console.debug("Failure Received:", message);
          break;
      }
    }

    // If it's not, show an error of some sort
    else {
      console.error("Message received from <iframe>, but was not from the expected origin.");
    }
  }, false);

  // Set up loading the current page from the last attached pane
  beaker.panes.setAttachable();
  let pane = await beaker.panes.attachToLastActivePane();
  if (pane) {
    paneURL = pane.url;
    targetURL = paneURL;
  }
  beaker.panes.addEventListener("pane-navigated", e => {
    paneURL = e.detail.url;
    targetURL = paneURL;
    loadMentions(e.detail.url);
  });
  if (paneURL) { loadMentions(paneURL); }
}

/********** Updating Configuration Views **********/

function updateAllConfigurationViews() {
  updateDarkModeView(configuration.darkMode);
  updateEndpointView(configuration.endpoint);
  updateDriveButtonView(configuration.isProfile);
  updateDriveInfoView(configuration.driveURL);
}

function updateDarkModeView(response) {
  // Change the highlighted style button
  if (response) {
    document.getElementById("config-theme-light").classList.remove("current");
    document.getElementById("config-theme-dark").classList.add("current");
  } else {
    document.getElementById("config-theme-light").classList.add("current");
    document.getElementById("config-theme-dark").classList.remove("current");
  }

  // Change the stylesheet
  if (response) { document.querySelector("link[title='page']").setAttribute("href", "dark.css"); }
  else { document.querySelector("link[title='page']").setAttribute("href", "light.css"); }
}

function updateEndpointView(response) {
  if (response) { document.getElementById("config-endpoint").value = response; }
}

function updateDriveButtonView(response) {
  if (response) { 
    document.getElementById("config-drive-profile").classList.add("current");
    document.getElementById("config-drive-drive").classList.remove("current");
  } else {
    document.getElementById("config-drive-profile").classList.remove("current");
    document.getElementById("config-drive-drive").classList.add("current");
  }
}

async function updateDriveInfoView(response) {
  if (response) {
    try {
      const driveInfo = await beaker.hyperdrive.getInfo(response);
      document.getElementById("config-drive-info").textContent = driveInfo.title;
    } catch {}
  }
}

/********** Browser Events **********/

// Configuration Events

function onConfigurationAnchorClick() {
  const configPage = document.getElementById("config");
  if (configPage.classList.contains("hidden")) { configPage.classList.remove("hidden"); }
  else { configPage.classList.add("hidden"); }
}

function onLightModeClick() {
  configuration.darkMode = false;
}

function onDarkModeClick() {
  configuration.darkMode = true;
}

async function onProfileButtonClick() {
  try {
    let profile = await beaker.contacts.requestProfile();
    configuration.isProfile = true;
    configuration.driveURL = profile.url;
  } catch {}
}

async function onDriveButtonClick() {
  try {
    let drive = await beaker.shell.selectDriveDialog({
      writable: true
    });
    configuration.isProfile = false;
    configuration.driveURL = drive;
  } catch {}
}

function onEndpointChange() {
  configuration.endpoint = document.getElementById("config-endpoint").value;
}

// Mention Loading Events

function onLoadingMentions() {
  document.getElementById("mentions").classList.add("hidden");
  document.getElementById("blank").classList.add("hidden");
  document.getElementById("no-endpoint").classList.add("hidden");
  document.getElementById("no-replies").classList.add("hidden");
  document.getElementById("loading").classList.remove("hidden");
  document.getElementById("mentions").textContent = "";
  document.getElementById("file-like-total").textContent = 0;
  document.getElementById("file-repost-total").textContent = 0;
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

/********** Load and append mentions **********/

async function loadMentions(url) {
  currentFile = new File({
    "url" : url,
    "validator" : validator,
    "domParser" : domParser
  });
  onLoadingMentions();
  await currentFile.init();
  document.getElementById("file-like-total").textContent = currentFile.totalLikes;
  document.getElementById("file-repost-total").textContent = currentFile.totalReposts;
  if (currentFile.endpoint) { setEndpoint(currentFile.endpoint); }
  if (!currentFile.endpoint) { onNoEndpoint(); }
  else if (!currentFile.mentions.length) { onNoReplies(); }
  else { onMentionsLoaded(); }
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

/********** <iframe>-setup functions **********/

function setEndpoint(endpoint) {
  if (((!endpointURL) || (endpoint !== endpointURL.href)) && configuration.useWindowMessage) {
    endpointURL = new URL(endpoint);
    endpointIframe.location.href = endpointURL;
    isEndpointReady(false);
  } else { isEndpointReady(true); }
}

function isEndpointReady(ready) {
  if (ready) {
    endpointReady = true;
    if (configuration.driveURL) {
      document.getElementById("sender-text").removeAttribute("disabled");
      document.getElementById("sender-send").removeAttribute("disabled");
      document.getElementById("sender-attach").removeAttribute("disabled");
      document.getElementById("sender-send").addEventListener("click", sendMarkdownMention);
      document.getElementById("sender-attach").addEventListener("click", sendFileMention);
    }
  } else {
    endpointReady = false;
    document.getElementById("sender-text").setAttribute("disabled", "disabled");
    document.getElementById("sender-send").setAttribute("disabled", "disabled");
    document.getElementById("sender-attach").setAttribute("disabled", "disabled");
    document.getElementById("sender-send").removeEventListener("click", sendMarkdownMention);
    document.getElementById("sender-attach").removeEventListener("click", sendFileMention);
  }
}

/********** Mention-sending functions **********/

async function sendMarkdownMention() {
  const markdown = document.getElementById("sender-text").value;
  const now = new Date();
  const path = `/beaker/beakermentions/${now.getTime()}.md`;
  if (endpointReady && configuration.driveURL) {
    const drive = beaker.hyperdrive.drive(configuration.driveURL);
    await drive.writeFile(path, markdown, "utf8");
    let metadata = {
      "inReplyTo" : targetURL
    }
    if (configuration.endpoint) { metadata.webmention = configuration.endpoint; }
    await drive.updateMetadata(path, metadata);
    const source = new URL(path, configuration.driveURL);
    pendingURL = source.href;
    await sendSendMessage(source.href, targetURL);
  }
}

async function sendFileMention() {
  /* STUB: Need to use File API to get uploaded files from user
  const upload = "Sample Uploaded File";
  const now = new Date();
  const path = `/beaker/beakermentions/samplepath.thing`;
  if (endpointReady && configuration.driveURL) {
    const drive = beaker.hyperdrive.drive(configuration.driveURL);
    await drive.writeFile(path, upload, "binary");
    let metadata = {
      "inReplyTo" : targetURL
    }
    if (configuration.endpoint) { metadata.webmention = configuration.endpoint; }
    await drive.updateMetadata(path, metadata);
    const source = new URL(path, configuration.driveURL);
    pendingURL = source.href;
    await sendSendMessage(source.href, targetURL);
  } */

  let selectedFile = await beaker.shell.selectFileDialog({
    title: "Select a file to add to your response",
    buttonLabel: "Select File",
    select: ["file"],
    allowMultiple: false,
    disallowCreate: false
  });
  const fileExtension = selectedFile[0].path.split(".").pop();
  let markdown;
  switch (fileExtension) {
    case "png":
    case "jpg":
    case "jpeg":
    case "gif":
    case "svg":
      markdown = `![Image's alternative text](${selectedFile[0].url})`;
      break;
    default:
      const selectedFilename = selectedFile[0].path.split("/").pop();
      markdown = `[${selectedFilename}](${selectedFile[0].url})`;
      break;
  }
  document.getElementById("sender-text").value += markdown;
}

async function sendSendMessage(source, target) {
  if (configuration.useWindowMessage) {
    endpointIframe.postMessage(JSON.stringify(WindowMessages.sendWebmention(source, target)), endpointURL.origin);
  } else {
    let targetEndpoint = await validator.getTargetEndpoint(target);
    let request = new URL(targetEndpoint);
    request.search = `?source=${source}&target=${target}&done=${location.origin}`;
    location.href = request;
  }
}

function sendGetMessage(target) {
  endpointIframe.postMessage(JSON.stringify(WindowMessages.getWebmentions(target)), endpointURL.origin);
}

main();