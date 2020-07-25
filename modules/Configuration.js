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
  #darkMode = "false";
  #endpoint = null;
  #isProfile = null;
  #driveURL = null;
  #endpointTimeout = null;
  #storage = null;

  constructor(localStorage, options = {}) {
    this.#storage = localStorage;
    if (options.darkMode) { this.#darkMode = options.darkMode; }
    if (options.endpoint) { this.#endpoint = options.endpoint; }
    if (options.isProfile) { this.#isProfile = options.isProfile; }
    if (options.driveURL) { this.#driveURL = options.driveURL; }
  }

  get darkMode() { return this.#darkMode; }
  get endpoint() { return this.#endpoint; }
  get isProfile() { return this.#isProfile; }
  get driveURL() { return this.#driveURL; }

  set darkMode(darkMode) {
    this.#darkMode = darkMode;
    this.#storage.setItem("darkMode", this.#darkMode);
  }

  set endpoint(endpoint) {
    clearTimeout(this.#endpointTimeout);
    this.#endpointTimeout = setTimeout(() => {
      this.#endpoint = endpoint;
      this.#storage.setItem("endpoint", this.#endpoint);
    }, 1000);
  }

  set isProfile(isProfile) {
    this.#isProfile = isProfile;
    this.#storage.setItem("isProfile", this.#isProfile);
  }

  set driveURL(driveURL) {
    this.#driveURL = driveURL;
    this.#storage.setItem("driveURL", this.#driveURL);
  }
}