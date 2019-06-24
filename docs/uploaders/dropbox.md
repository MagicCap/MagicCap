# Dropbox
Dropbox is designed for uploading larger files. To use Dropbox, you will need to do the following:
1. Go to the Dropbox Apps Console at https://www.dropbox.com/developers/apps.
2. Click "Create app". Select "Dropbox API" and then "Full Dropbox". You can give this application any name.
3. Add `http://127.0.0.1:61222` to the `Redirect URIs` list.
4. Take the app key and put it in `Client ID`, and the app secret and put it in `Client Secret`.
5. You can set the path you want Dropbox files to go to with `Dropbox Path`.
6. If you want your links to be password protected and you have Dropbox Pro, enter it there.
7. You can then click the button by `Token` to sign into your Dropbox account. This will then be configured.
