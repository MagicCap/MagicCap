<p><img src="https://i.imgur.com/3YKOjAF.png" alt="MagicCap" width="50%"></p>

<p>
    <a href="https://circleci.com/gh/MagicCap/MagicCap/tree/master" title="CircleCI" target="_blank">
        <img src="https://img.shields.io/circleci/build/github/MagicCap/MagicCap.svg?logo=CircleCI&logoColor=fff" alt=""/>
    </a>
    <a href="https://magiccap.readthedocs.io/en/latest/?badge=latest" title="Read the Docs Documentation" target="_blank">
        <img src="https://img.shields.io/readthedocs/magiccap.svg?logo=Read-the-Docs&logoColor=fff" alt=""/>
    </a>
    <a href="https://opensource.org/licenses/MPL-2.0" title="Licensed under MPL 2.0" target="_blank">
        <img src="https://img.shields.io/badge/license-MPL%202.0-brightgreen.svg?logo=Mozilla&logoColor=fff" alt=""/>
    </a>
    <a href="https://patreon.com/jakemakesstuff" title="Donate to this project using Patreon" target="_blank">
        <img src="https://img.shields.io/badge/patreon-donate-yellow.svg?logo=Patreon&logoColor=fff" alt=""/>
    </a>
    <a href="https://ko-fi.com/jakemakesstuff" title="Donate to this project using ko-fi" target="_blank">
        <img src="https://img.shields.io/badge/kofi-donate-yellow.svg?logo=Ko-fi&logoColor=fff" alt=""/>
    </a>
    <a href="https://discord.gg/pTcBGcH" title="Chat on Discord" target="_blank">
        <img src="https://img.shields.io/discord/475694715640217631.svg?logo=discord&logoColor=fff&color=7289DA" alt=""/>
    </a>
</p>

MagicCap is a image/GIF capture suite for Mac and Linux. You can get a precompiled copy from the releases page of this GitHub page. It has the following features:

- Very cross compatible. You should get the same experience on Mac and Linux.
- Very easy to add to. You don't need to faff around with modifying HTML; instead you write a small file that includes all of the config options and the upload script (most of this is handled by `capture.js` anyway).
- Very fast. Captures are optimised to be as fast as possible.
- Very flexible. You can choose to upload to whatever service you want to or just save the file.
- Very functional. Want to capture a GIF? No problem. Want to blur a screenshot? No problem. MagicCap is there to help you with whatever you want.

# This is not for Windows!
[ShareX](https://getsharex.com/) is amazing for that!

# Supported Uploaders
MagicCap supports the following uploaders (this list will expand over time):
- Custom HTTP POST
- elixi.re
- Passive (S)FTP
- Pomf
- imgur
- Lunus
- i.magiccap
- reUpload
- Ultrashare
- S3 (Amazon and other S3-compatible providers)
- ShareX (upload only)

# Credit
The following people have done a ton to help in the creation of MagicCap. If you have done something to help and want your name here, feel free to make a pull request. This is in alphabetical order, not the order of the work people have done:
- Devon (Da532) - Made all of the branding.
- Harrison (AO554) - Helped us test for Mac.
- Jacob (Kelwing) - Helped with some Go towards the project.
- Jake (JakeMakesStuff) - Made the majority of the GUI/capture code for MagicCap.
- Jake (techfan36) - Helped us test for Linux.
- Matt (IPv4) - Refactored file naming, added random emoji & upload from clipboard.
- Rhys (SunburntRock89) - Helped me with the structure and fixing bugs. Also fixed FTP.
- Sam (REC) - Made the FTP logo.

# Building
In order to download needed packages, run `npm i`. This will get all of the needed packages. You can then run one of the following commands:
- `npm run maccompile` - Compiles for Mac.
- `npm run linuxcompile` - Compiles for Linux.

## Mac Note
If you are on Mac, you'll need to download XCode.

## More Information
For more information on installation/configuration and compiling, please refer to [the documentation.](https://magiccap.readthedocs.io/en/latest/?badge=latest)
