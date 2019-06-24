# FTP Support
This allows you to upload files to a FTP server and simply return a URL to the image. This has the following configuration options:
- `Hostname` - Defines the hostname of the FTP server.
- `Port` - Defines the port for the FTP server.
- `Username` - Defines the username for the FTP user.
- `Password` - Defines the password for the FTP user.
- `Directory` - Defines the directory on the server to upload the files too.
- `Base URL` - Defines the base URL for the FTP server. This will mean that when the URL is returned, it will be returned in the format of `<base URL>/<filename>`.
