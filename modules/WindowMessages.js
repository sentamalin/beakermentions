// Beakermentions (WindowMessages.js) - Read and send responses on what you're
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

export function sendOrigin() {
  return {
    type: "origin"
  };
}

export function sendWebmention(source, target) {
  return {
    type: "send",
    source: source,
    target: target
  };
}

export function getWebmentions(target) {
  return {
    type: "get",
    target: target
  };
}