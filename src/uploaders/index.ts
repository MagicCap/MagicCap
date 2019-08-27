import custom from "./custom"
import elixire from "./elixire"
import ftp from "./ftp"
import imgur from "./imgur"
import magiccap from "./magiccap"
import novus from "./lunus"
import pomf from "./pomf"
import reupload from "./reupload"
import s3 from "./s3"
import sharex from "./sharex"
import ultrashare from "./ultrashare"
import sftp from "./sftp"
import dropbox from "./dropbox"
import gdrive from "./gdrive"
import rlme from "./rlme"
import freethewumpus from "./freethewumpus"

export const uploaders = {
    custom, elixire, ftp, imgur, magiccap, novus, pomf,
    reupload, s3, sharex, ultrashare, sftp, dropbox,
    gdrive, rlme, freethewumpus,
}

export const nameUploaderMap = {} as any
export const importedUploaders = {} as any
export const handleUploaderRejigging = () => {
    for (const key in nameUploaderMap) delete nameUploaderMap[key]
    for (const key in importedUploaders) delete importedUploaders[key]
    for (const uploaderName in uploaders) {
        const import_ = (uploaders as any)[uploaderName]
        importedUploaders[import_.name] = import_
        nameUploaderMap[uploaderName] = import_.name
    }
}
handleUploaderRejigging()
