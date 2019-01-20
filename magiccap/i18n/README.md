# MagicCap Internationalisation
This folder contains all of the internationalisation parts of MagicCap.

## How do I add a language?
To create a language pack, simply run `add_lang.py` and follow the steps. Please note that the ISO 639-1 language code/language name must be unique. After you run this, a folder will be created by the name of the ISO 639-1 language code. Inside will be *.po files. To add a translation, simply change the `msgstr` to the translation of the `msgid` directly above. **DO NOT TRANSLATE THE INSIDES OF CURLY BRACKETS!**

Here is a example of how each part will look:
```po
# example/example.js:100
msgid "Welcome {user}!"
msgstr "Benvenuto {user}!"
```
