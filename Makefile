build:
	UNAME_S := $(shell uname -s)
	ifeq ($(UNAME_S),Linux)
		$(shell echo "Linux")
	else
		ifeq ($(UNAME_S),Darwin)
			$(shell echo "macOS")
		else
			$(error Unknown platform.)
		endif
	endif
