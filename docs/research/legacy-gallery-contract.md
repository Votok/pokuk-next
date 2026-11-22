# Legacy gallery contract

The uploader builds a local inventory from folders, then adds new events to the existing Azure inventory. The web app reads the published inventory. A local file, a published reference and a readable image blob are three separately observable facts. The method behind each is described below. [Scan] [Merge] [Storage] [Reader]

## From folder to event

The scan visits immediate child directories of the configured gallery root in ascending directory-name order. It parses the first four characters as an integer year, groups by that year and takes the suffix starting at offset eight verbatim as `Name`. The local convention is an eight-digit calendar date followed immediately by the event name. The scanner only parses the year. Month and day affect directory ordering but drop out of the event identity. Within a year, events with the same suffix on different dates have the same merge key and detail ID. Changing the display name preserves both. [Scan] [Merge] [Reader] [Local check](#local-check)

For each event the scanner takes the first immediate file returned by `GetFiles("*.txt")`. It drops the first two filename characters and removes literal lowercase `.txt` occurrences to obtain `FriendlyName`. The observed marker prefix is `__`. Its contents are never read. Missing markers throw, multiple matches have no explicit tie-breaker, and too-short or unparseable directory names can abort the scan. It then sorts immediate files by name and includes only those whose extension equals lowercase `.jpg`. Uppercase `.JPG`, `.jpeg`, nested photos and unrelated files do not enter this list. A marked event may have an empty photo list. Both ascending sorts use the .NET default string comparer. The code specifies neither a natural numeric sort nor ordinal collation. [Scan]

A wholly fictional folder `20990314MoonKites/` with marker `__Paper skies.txt` and photo `kite-01.jpg` would yield year `2099`, name `MoonKites`, label `Paper skies`, detail ID `2099MoonKites` and flat blob key `2099_MoonKites_kite-01.jpg`. [Scan] [Model] [Reader]

## Serialized wire fields

| Object | Exact fields and types | How the writer uses them |
| --- | --- | --- |
| Gallery | `Years` array | Each element is a gallery year. |
| Year | `Year` integer, `GalleryEvents` array | The year groups events. |
| Event | `Name` string, `FriendlyName` string, `Files` array, `IsUploaded` boolean | The name identifies the event within the year. The friendly name is its visible label. File array order determines the cover and detail sequence. |
| File | `FileName` string, `FullFileName` string, `AzureLikeFileName` string, `AzureFullUlr` string | The leaf filename, absolute local path, flat blob key and constructed image URL respectively. The final field ends in **Ulr**. |

These are the field types observed in the local JSON and produced for ordinary scanned files. The generated key concatenates year, event name and the original filename with underscores, with no escaping or disambiguation. Keep the components as recorded. Splitting the resulting key on underscores is ambiguous. The URL is the configured container URL concatenated directly with the key. The writer inserts no slash and performs no explicit URL encoding. The storage client uses the independently configured container name and the key to upload the image. A bad base URL can therefore advertise the wrong location even after a successful upload. The serialized objects include the absolute local path. The uploader uses it to open the source photo, and the web views use the URL to load images. [Model] [Storage] [Views] [Local check](#local-check)

`IsUploaded` is a getter that tests whether every file has a non-null `AzureFullUlr`. The generator assigns that string before opening a blob connection for image upload. Even an empty file list passes the test. The flag carries no delivery acknowledgement. [Model] [Merge]

## Publication and divergence

1. The hosted worker calls `AddNewEventsToAzure`. It rebuilds the gallery from disk and overwrites the configured local JSON file (default `_gallery.json`) before reading the Azure manifest. Although a separate local JSON reader exists, this operation never calls it. Manual changes to the local JSON disappear on regeneration. [Worker] [Scan] [Merge]
2. The provider downloads and deserializes the configured JSON blob. The upload path expects an existing readable manifest. A missing or unreadable blob, or invalid JSON, can stop the run after the local file has been saved. [Storage] [Merge]
3. The merge matches integer year, then exact case-sensitive `Name`. For an existing year it appends each missing event and uploads that event’s files. For a new year it appends the entire year and uploads its events. An already-matched event is skipped as a unit. Edited labels, replaced, added or removed photos, and missing remote images in that event receive no reconciliation. Remote-only entries survive. Changing a name or year can add a second published entry while leaving its predecessor in place. [Merge]
4. Images are uploaded individually with `image/jpeg`. After all additions finish, and only when something was added, the uploader serializes the merged gallery and uploads the manifest with `application/json`. A successful image write can precede its published listing. An interrupted run can leave uploaded photos outside the old manifest. A retry uses the manifest it reads on that run. The code has no transaction across blobs, remote file inventory check or conditional manifest write to protect concurrent merges. Two writers starting from the same manifest can lose one another’s additions. [Merge] [Storage]

## Published page behavior

On first use the web service reads the Azure JSON into a static in-process instance. Later requests reuse it without a refresh check. A running instance can therefore continue serving an older listing after publication. The index sorts years descending by number and each year’s events descending by `Name`. It shows `FriendlyName`, the length of `Files`, and the first file’s `AzureFullUlr` as the cover, with a placeholder if there is no cover. [Reader] [Views]

The index links to `Home/Detail` with the decimal year immediately followed by the event name. The lookup parses the first four characters of the ID and compares the remainder exactly to `Name` in the matching year. It returns the first match. A well-formed, unmatched ID redirects to the index. A missing or too-short ID can throw before that fallback. The detail view iterates the manifest file sequence and uses `AzureFullUlr` for both thumbnails and lightbox links. The wire fields carry no per-image dimensions. The view replaces its provisional dimensions with those measured by the browser when available. [Reader] [Views]

## Local check

A read-only comparison checked the generated manifest against the immediate event folders, TXT marker names and lowercase JPEG directory entries. The JSON field names and types matched the table. The derived year/name pairs, marker-derived display labels, sets of photo filenames, absolute source paths, flat keys, URL suffixes and computed flags agreed. The local folders followed the date-prefix convention, including markers with non-ASCII labels. Other file types were present and excluded from the photo lists. The stored photo sequence cannot in general be reproduced by sorting filenames by Unicode code point. Preserve the stored sequence when reading. This check used directory metadata and JSON, without opening image data or executing the uploader. [Scan] [Model]

The comparison establishes local consistency only. Confirming the deployed manifest contents or version requires reading the deployed manifest. Confirming that referenced objects exist and a visitor can retrieve them requires separate remote checks of storage and visitor access. Detecting unlisted blobs requires a container inventory. This research leaves all of those remote states unverified. [Storage] [Reader]

## Primary source references

Paths below are relative to the respective legacy code checkouts. The local comparison is the first-hand source for the observations labeled *Local check*.

- **[Scan]** `pokuk-common` at `1bf3f5b`, `Services/FileService.cs` lines 14–90 and `GalleryOptions.cs` lines 7–13.
- **[Model]** Same revision, `Model/Gallery.cs`, `Model/GalleryYear.cs`, `Model/GalleryEvent.cs` lines 7–41 and `Model/GalleryFile.cs` lines 7–15.
- **[Merge]** Same revision, `GalleryProvider.cs` lines 20–76.
- **[Storage]** Same revision, `Services/AzureService.cs` lines 15–75.
- **[Worker]** `pokuk-upload` at `2f1d9d9`, `Worker.cs` lines 16–34.
- **[Reader]** `pokuk-web` at `7242061`, `Code/GalleryService.cs` lines 20–49, `Controllers/HomeController.cs` lines 20–36 and `Startup.cs` lines 51–55.
- **[Views]** Same revision, `Views/Home/Index.cshtml` lines 14–43 and `Views/Home/Detail.cshtml` lines 25–48 and 74–94.
