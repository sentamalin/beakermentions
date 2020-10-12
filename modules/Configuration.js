// Beakermentions (Configuration.js) - Read and send responses on what you're
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

export class Configuration {
  #darkMode = false;
  #endpoint = null;
  #isProfile = null;
  #driveURL = null;
  #useWindowMessage = false;
  #endpointTimeout = null;
  #storage = null;

  constructor(localStorage, options = {}) {
    this.#storage = localStorage;
    if (options.darkMode) { 
      if (options.darkMode === "true") { this.#darkMode = true; }
      else { this.#darkMode = false; }
    }
    if (options.isProfile) {
      if (options.isProfile === "true") { this.#isProfile = true; }
      else { this.#isProfile = false; }
    }
    if (options.useWindowMessage) {
      if (options.useWindowMessage === "true") { this.#useWindowMessage = true; }
      else { this.#useWindowMessage = false; }
    }
    if (options.endpoint) { this.#endpoint = options.endpoint; }
    if (options.driveURL) { this.#driveURL = options.driveURL; }
  }

  get darkMode() { return this.#darkMode; }
  get endpoint() { return this.#endpoint; }
  get isProfile() { return this.#isProfile; }
  get driveURL() { return this.#driveURL; }
  get useWindowMessage() { return this.#useWindowMessage; }

  set darkMode(darkMode) {
    this.#darkMode = darkMode;
    this.#storage.setItem("darkMode", this.#darkMode);
    this.darkModeSet(darkMode);
  }
  darkModeSet(darkMode) {}
  onDarkModeSet(eventHandler) { this.darkModeSet = eventHandler; }

  set useWindowMessage(useWindowMessage) {
    this.#useWindowMessage = useWindowMessage;
    this.#storage.setItem("useWindowMessage", this.#useWindowMessage);
    this.useWindowMessageSet(useWindowMessage);
  }
  useWindowMessageSet(useWindowMessage) {}
  onUseWindowMessageSet(eventHandler) { this.useWindowMessageSet = eventHandler; }

  set endpoint(endpoint) {
    clearTimeout(this.#endpointTimeout);
    this.#endpointTimeout = setTimeout(() => {
      this.#endpoint = endpoint;
      this.#storage.setItem("endpoint", this.#endpoint);
      this.endpointSet(endpoint);
    }, 1000);
  }
  endpointSet(endpoint) {}
  onEndpointSet(eventHandler) { this.endpointSet = eventHandler; }

  set isProfile(isProfile) {
    this.#isProfile = isProfile;
    this.#storage.setItem("isProfile", this.#isProfile);
    this.isProfileSet(isProfile);
  }
  isProfileSet(isProfile) {}
  onIsProfileSet(eventHandler) { this.isProfileSet = eventHandler; }

  set driveURL(driveURL) {
    this.#driveURL = driveURL;
    this.#storage.setItem("driveURL", this.#driveURL);
    this.driveURLSet(driveURL);
  }
  driveURLSet(driveURL) {}
  onDriveURLSet(eventHandler) { this.driveURLSet = eventHandler; }
}