# Welcome to the MagicCap documentation

On this page, you should find everything you need to know to use MagicCap.

## Installation/Configuration
You can grab the latest MagicCap release from [here](https://github.com/JakeMakesStuff/MagicCap/releases). From here, you can install it like you would any other application. To configure it, simply click/right click the icon in your taskbar and select "Config". You will be greeted with the GUI:

![gui](https://that-one-12-year-old.pinged-b1nzy-for.fun/cuzc5.png)

As you can see, the GUI is split into 2 parts:

- **Configuration Sidebar** - This contains all of the buttons needed in order to configure MagicCap.
- **History** - This contains information your last 20 captures such whether they failed or were successful, the URL if you are uploading and access to the file if you are saving it.

The configuration sidebar contains several important items:

### About
This isn't too important, this just lists the license and copyright.

### Selection Capture/Window Capture
This is the core functionality of the software. Clicking one of these (also in the sidebar and can be set to a hotkey which is discussed later) triggers the software on your OS to do the capture specified. The actions after the capture are handled by the other buttons.

### Clipboard Action
This is what will be in your clipboard after the capture. You can choose from the following:

- **Copy the uploaded URL to the clipboard (requires file uploads to be on).** - This will not work if uploads is off. This function means that the URL to your image will be pasted into your clipboard after the file is uploaded.
- **Copy the image to the clipboard.** - This will put the actual image in your clipboard.

### File Configuration
There are several options you can configure here:

- **Save files to your device after capturing.** - This toggles whether files save to your drive after capturing or not.
- **File Naming Pattern** - This is where you can configure how file names are created. You can use " to represent a random character, %date% for the date and %time% for the time. It is important to note that you can combine patterns, so `"""""_%date%_%time%` is acceptable. Here is how it would look in several patterns for example:
    - `"""""` - `Qgg4k` (This pattern randomises from a-z/A-Z/0-9 every capture)
    - `%date%` - `19-10-2018` (This would be the date on the capture day)
    - `%time%` - `10-48-50` (This would be the time when the image was captured)
- **File Save Folder** - This is the folder that files would save to. MagicCap automatically makes a directory in your pictures folder for this named `MagicCap`.

### Hotkey Settings
This allows you to create hotkeys for Window/Selection Capture based on [this documentation](https://electronjs.org/docs/api/accelerator).

### Upload Configuration
The upload configuration allows for extremely flexible configuration of uploaders. Firstly, you can `Upload files once they are captured.`. This dictates whether the files actually get uploaded. Then there are several buttons for all of the supported uploaders. They will all contain "Set as Default Uploader" which will allow you to set it as default and there may be specific options for each uploader.

### Toggle Theme
This toggles between the light and dark theme.

## Compiling

You'll need to download the MagicCap repository and run `cd ./magiccap`. In order to download needed packages, run `npm i`. This will get all of the needed packages. You can then run one of the following commands:

- `npm run windowscompile` - Compiles for Windows. This requires Wine on systems that are not running Windows. **This is for development only. We will NOT release for Windows.**
- `npm run maccompile` - Compiles for Mac.
- `npm run linuxcompile` - Compiles for Linux.

### Mac Note
If you are on Mac, you'll need to download XCode.
