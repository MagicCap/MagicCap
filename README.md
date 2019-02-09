<img src="https://i.imgur.com/3YKOjAF.png" alt="logo" width="50%" height="50%" href="#">

[![Build Status](https://travis-ci.org/MagicCap/MagicCap.svg?branch=master)](https://travis-ci.org/MagicCap/MagicCap)
[![Documentation Status](https://readthedocs.org/projects/magiccap/badge/?version=latest)](https://magiccap.readthedocs.io/en/latest/?badge=latest)
[![License: MPL 2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](https://opensource.org/licenses/MPL-2.0)
<span class="badge-patreon"><a href="https://patreon.com/jakemakesstuff" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<span class="badge-patreon"><a href="https://ko-fi.com/jakemakesstuff" title="Donate to this project using ko-fi"><img src="https://img.shields.io/badge/kofi-donate-yellow.svg" alt="Patreon donate button" /></a></span>
<a href="https://discord.gg/pTcBGcH">
        <img src="https://img.shields.io/discord/475694715640217631.svg?logo=discord"
            alt="chat on Discord">
</a>

MagicCap is a image capture suite for Mac and Linux. You can get a precompiled copy from the releases page of this GitHub page. It has the following features:

- Very cross compatible. You should get the same experience on Mac and Linux.
- Very easy to add to. You don't need to faff around with modifying HTML; instead you write a small file that includes all of the config options and the upload script (most of this is handled by `capture.js` anyway).
- Very fast. Captures are optimised to be as fast as possible.
- Very flexible. You can choose to upload to whatever service you want to or just save the file.

# This is not for Windows!
[ShareX](https://getsharex.com/) is amazing for that!

# Requirements
Linux requires `gnome-screenshot` for this to work. The application should not be ran as root.

# Supported Uploaders
MagicCap supports the following uploaders (this list will expand over time):
- Bread.moe
- Custom HTTP POST
- elixi.re
- FTP
- Pomf
- imgur
- i.novus
- S3 (Amazon and other S3-compatible providers)
- ShareX (upload only)

# Credit
The following people have done a ton to help in the creation of MagicCap. If you have done something to help and want your name here, feel free to make a pull request. This is in alphabetical order, not the order of the work people have done:
- Devon (Da532) - Made all of the branding.
- Harrison (AO554) - Helped us test for Mac.
- Jake (JakeMakesStuff) - Made the majority of the GUI/capture code for MagicCap.
- Jake (techfan36) - Helped us test for Linux.
- Rhys (SunburntRock89) - Helped me with the structure and fixing bugs. Also fixed FTP.
- Sam (REC) - Made the FTP logo.

# Building
In order to download needed packages, run `npm i`. This will get all of the needed packages. You can then run one of the following commands:
- `npm run maccompile` - Compiles for Mac.
- `npm run linuxcompile` - Compiles for Linux.

## Mac Note
If you are on Mac, you'll need to download XCode.
