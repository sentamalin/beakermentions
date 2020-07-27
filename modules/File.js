// Beakermentions (File.js) - Read and send responses on what you're
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

import { WebmentionValidator } from "./Validator/index.js";

export class File {
  #url;
  #endpoint;
  #thumb;
  #author;
  #content;
  #isMentioning;
  #isALike = false;
  #isARepost = false;
  #isAReply = false;
  #totalLikes = 0;
  #totalReposts = 0;
  #totalReplies = 0;
  #mentions = [];
  #validator;
  #domParser;

  get url() { return this.#url; }
  get endpoint() { return this.#endpoint; }
  get thumb() { return this.#thumb; }
  get author() { return this.#author; }
  get content() { return this.#content; }
  get isALike() { return this.#isALike; }
  get isARepost() { return this.#isARepost; }
  get isAReply() { return this.#isAReply; }
  get totalLikes() { return this.#totalLikes; }
  get totalReposts() { return this.#totalReposts; }
  get totalReplies() { return this.#totalReplies; }
  get mentions() { return this.#mentions; }
  get sendLink() { return `${this.#endpoint}?target=${this.#url}`; }

  /********** Constructor/Init **********/

  constructor(options) {
    this.#url = options.url;
    if (options.isMentioning) { this.#isMentioning = options.isMentioning; }
    else { this.#isMentioning = null; }
    if (options.domParser) { this.#domParser = options.domParser; }
    else { this.#domParser = new DOMParser(); }
    if (options.validator) { this.#validator = options.validator; }
    else { this.#validator = new WebmentionValidator({ domParser: this.#domParser }); }
  }

  async init() {
    this.#endpoint = await this.#validator.getTargetEndpoint(this.#url);
    let urlSplit = this.#url.split("/");
    let drive = `${urlSplit[0]}//${urlSplit[2]}/`;
    for (let i = 0; i < 3; i++) { urlSplit.shift(); }
    let path = `/${urlSplit.join("/")}`;
    let hyperRegex = new RegExp(/hyper:\/\//i);

    // If the file is from a Hyperdrive
    if (hyperRegex.test(this.#url)) {
      let hyperdrive = beaker.hyperdrive.drive(drive);
      try {
        let stat = await hyperdrive.stat(path);

        // As a default, use the drive icon as the thumbnail
        this.#thumb = `${drive}thumb`;

        // As a default, use the drive's title as the author
        let driveInfo = await hyperdrive.getInfo();
        this.#author = driveInfo.title;

        // Check and make sure that the path is a file and not a directory
        if (!stat.isFile()) {
          let newPath = `${path}index.html`;
          try {
            let newStat = await hyperdrive.stat(newPath);
            if (newStat.isFile()) { 
              path = newPath;
              stat = newStat;
            }
          } catch {}
        }
        if (!stat.isFile()) {
          let newPath = `${pathath}index.md`;
          try {
            let newStat = await hyperdrive.stat(newPath);
            if (newStat.isFile()) {
              path = newPath;
              stat = newStat;
            }
          } catch {}
        }

        // Check the metadata to determine what kind of mention this may be
        if (this.#isMentioning) {
          if (stat.metadata.inReplyTo) {
            if (stat.metadata.inReplyTo === this.#isMentioning) { this.#isAReply = true; }
          }
          if (stat.metadata.likeOf) {
            if (stat.metadata.likeOf === this.#isMentioning) { this.#isALike = true; }
          }
          if (stat.metadata.repostOf) {
            if (stat.metadata.repostOf === this.#isMentioning) { this.#isARepost = true; }
          }
        }

        if (stat.isFile()) {
          let htmlRegex = new RegExp(/\.html?$/i);
          // If the file is HTML
          if (htmlRegex.test(path)) {
            let file = await hyperdrive.readFile(path, "utf8");
            this.#parseHTML(file);
            await this.#readyMentions();
          }

          // Otherwise treat as some other file based on its extension
          else {
            let pathSplit = path.split(".");
            switch (pathSplit[pathSplit.length - 1]) {
              case "md":
                let file = await hyperdrive.readFile(path, "utf8");
                let markdown = beaker.markdown.toHTML(file);
                this.#content = {
                  "type" : "html",
                  "content" : markdown
                };
                break;
              case "png":
              case "jpg":
              case "jpeg":
              case "gif":
              case "svg":
                this.#content = {
                  "type" : "image",
                  "url" : this.#url
                };
                break;
              default:
                this.#content = {
                  "type" : "file",
                  "url" : this.#url
                };
                break;
            }
            await this.#readyMentions();
          }
        }
      } catch (error) {
        console.error("File.init:", error);
        console.debug("File.init: Failed to get the file; it may be offline.");
        this.#thumb = null;
        this.#author = null;
        this.#content = {
          "type" : "offline"
        };
        this.#mentions = [];
        this.#totalReplies = 0;
        this.#totalLikes = 0;
        this.#totalReposts = 0;
      }
    }

    // Otherwise, treat it as from HTTP/S
    else {
      try {
        let response = await fetch(this.#url);
        if (response.ok) {
          // Get the URL's Content-Type
          let contentType = response.headers.get("content-type");

          let htmlRegex = new RegExp(/text\/html/i);
          let xhtmlRegex = new RegExp(/application\/xhtml\+xml/i);

          // If the file is HTML
          if (htmlRegex.test(contentType) || xhtmlRegex.test(contentType)) {
            let file = await response.text();
            this.#parseHTML(file);
            await this.#readyMentions();
          }

          // Otherwise, treat the file according to its Content-Type
          else {
            let imageRegex = new Regex(/image\//i);
            let markdownRegex = new Regex(/text\/markdown/i);
            if (markdownRegex.test(contentType)) {
              let file = await response.text();
              let markdown = beaker.markdown.toHTML(file);
              this.#content = {
                "type" : "html",
                "content" : markdown
              };
            } else if (imageRegex.test(contentType)) {
              this.#content = {
                "type" : "image",
                "url" : this.#url
              };
            } else {
              this.#content = {
                "type" : "file",
                "url" : this.#url
              };
            }
            await this.#readyMentions();
          }
        } else { throw "fetchResponseNotOk"; }
      } catch (error) {
        console.error("File.init:", error);
        console.debug("File.init: Failed to get the file; it may be offline.");
        this.#thumb = null;
        this.#author = null;
        this.#content = {
          "type" : "offline"
        };
        this.#mentions = [];
        this.#totalLikes = 0;
        this.#totalReposts = 0;
      }
    }
  }

  /********** Private Methods **********/

  async #readyMentions() {
    if (this.#endpoint) {
      try {
        let mentionsFile = await beaker.hyperdrive.readFile(`${this.#url}.webmention`, "utf8");
        let mentions = JSON.parse(mentionsFile);
        mentions.forEach(mention => {
          this.#mentions.push(new File({
            url: mention,
            isMentioning: this.#url,
            validator: this.#validator,
            domParser: this.#domParser
          }));
        });
        for (let i = 0; i < this.#mentions.length; i++) {
          await this.#mentions[i].init();
          if (this.#mentions[i].isALike) { this.#totalLikes++; }
          if (this.#mentions[i].isARepost) { this.#totalReposts++; }
          if (this.#mentions[i].isAReply) { this.#totalReplies++; }
        }
      } catch (error) {}
    }
  }

  #parseHTML(file) {
    let parsedContent = this.#domParser.parseFromString(file, "text/html");

    // Get the thumbnail from a @rel="icon", if available
    let thumb = parsedContent.querySelector("*[rel*='icon']");
    if (thumb) {
      url = new URL(thumb.getAttribute("href"), this.#url);
      this.#thumb = url.toString();
    }

    // Get the author from the HTML, if available
    let authorElement = parsedContent.querySelector(".h-entry .p-author");
    let titleElement = parsedContent.querySelector("title");
    if (authorElement) {
      this.#author = authorElement.textContent;
    } else if (titleElement) {
      this.#author = titleElement.textContent;
    }

    // Get the content from microformats, then meta description, then main, then body
    let summaryElement = parsedContent.querySelector(".h-entry .p-summary");
    let contentElement = parsedContent.querySelector(".h-entry .e-content");
    let twitterElement = parsedContent.querySelector("meta[name='twitter:description']");
    let openGraphElement = parsedContent.querySelector("meta[property*='og:description']");
    let descriptionElement = parsedContent.querySelector("meta[name='description']");
    let mainElement = parsedContent.querySelector("main");
    let articleElement = parsedContent.querySelector("article");
    let bodyElement = parsedContent.querySelector("body");
    if (summaryElement) {
      this.#content = { 
        "type" : "text",
        "content" : summaryElement.textContent
      };
    } else if (contentElement) {
      this.#content = {
        "type" : "text",
        "content" : contentElement.textContent
      };
    } else if (twitterElement) {
      this.#content = {
        "type" : "text",
        "content" : twitterElement.getAttribute("content")
      };
    } else if (openGraphElement) {
      this.#content = {
        "type" : "text",
        "content" : openGraphElement.getAttribute("content")
      };
    } else if (descriptionElement) {
      this.#content = {
        "type" : "text",
        "content" : descriptionElement.getAttribute("content")
      };
    } else if (mainElement) {
      this.#content = {
        "type" : "text",
        "content" : mainElement.textContent
      };
    } else if (articleElement) {
      this.#content = {
        "type" : "text",
        "content" : articleElement.textContent
      };
    } else {
      this.#content = {
        "type" : "text",
        "content" : bodyElement.textContent
      };
    }

    // Find what kind of mentions this may be in the HTML
    if (this.#isMentioning) {
      let allReplies = parsedContent.querySelectorAll(".u-in-reply-to");
      let allLikes = parsedContent.querySelectorAll(".u-like-of");
      let allReposts = parsedContent.querySelectorAll(".u-repost-of");
      for (let i = 0; i < allReplies.length; i++) {
        if (allReplies[i].getAttribute("href") === this.#isMentioning) { this.#isAReply = true; }
      }
      for (let i = 0; i < allLikes.length; i++) {
        if (allLikes[i].getAttribute("href") === this.#isMentioning) { this.#isALike = true; }
      }
      for (let i = 0; i < allReposts.length; i++) {
        if (allReposts[i].getAttribute("href") === this.#isMentioning) { this.#isARepost = true; }
      }
    }
  }
}