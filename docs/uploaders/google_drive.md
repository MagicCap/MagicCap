# Google Drive
Google Drive is designed for uploading larger files. To use Google Drive, you will need to do the following:
1. Go to https://console.developers.google.com/.
2. Go to "Credentials". If you are prompted to create a project, go ahead and create one. The name doesn't matter here.
3. Click "Create credentials" and then "OAuth client ID".
4. If you get prompted for an application name, just type anything in there. It will not affect the remainder of this.
5. Click "Web application" and in "Authorized redirect URIs", enter `http://127.0.0.1:61222` and press ENTER to add it.
6. Enter the client ID/secret into the MagicCap configuration for Google Drive. You can then click the button by `Token` to sign into your Google account. This will then be configured.
