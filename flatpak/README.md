# Flathub submission files

These files are **only** for publishing Mine4Ease on
[Flathub](https://flathub.org/). They are **not** used to build the `.flatpak`
bundle attached to GitHub Releases — electron-builder generates its own manifest
for that from the `flatpak` block in `../electron-builder.json5`.

| File | Purpose |
| --- | --- |
| `io.github.mine4ease.yml` | Flatpak build manifest (build-from-source) |
| `io.github.mine4ease.metainfo.xml` | AppStream metadata (required, validated) |
| `io.github.mine4ease.desktop` | Desktop entry |
| `generated-sources.json` | **Generated** — offline dependency sources (not committed here) |

## Why build-from-source needs a generated sources file

Flathub's build servers have **no network access**. Since `yarn install` can't
reach the network there, every dependency (including the Electron binary) must
be pre-resolved into `generated-sources.json`, which the manifest lists as a
source.

## 1. Generate `generated-sources.json`

Install the Node generator from
[flatpak-builder-tools](https://github.com/flatpak/flatpak-builder-tools):

```bash
pip install "git+https://github.com/flatpak/flatpak-builder-tools.git#subdirectory=node"
```

Install the App Stream CLI from
[AppStream CLI](https://flathub.org/en/apps/org.freedesktop.appstream.cli)

Then, from the repo root (our lockfile is yarn **classic**, v1):

```bash
flatpak-node-generator yarn yarn.lock -o flatpak/generated-sources.json -r --electron-node-headers
```

Regenerate this file whenever `yarn.lock` changes.

## 2. Install the build toolchain (once)

```bash
flatpak install --user -y flathub \
  org.freedesktop.Platform//25.08 \
  org.freedesktop.Sdk//25.08 \
  org.freedesktop.Sdk.Extension.node22//25.08 \
  org.electronjs.Electron2.BaseApp//25.08
```

## 3. Build and test locally

```bash
cd flatpak
flatpak-builder --user --install --force-clean build-dir io.github.mine4ease.yml
flatpak run io.github.mine4ease
```

Validate the metadata before submitting:

```bash
appstreamcli validate flatpak/io.github.mine4ease.metainfo.xml
desktop-file-validate flatpak/io.github.mine4ease.desktop
```

## 4. Submit to Flathub

1. Set the `git` source in the manifest to the release **tag** you're shipping.
2. Fork <https://github.com/flathub/flathub>, create a branch named
   `io.github.mine4ease`, and add the manifest + metainfo + desktop file
   (and `generated-sources.json`).
3. Open a pull request and follow the review process:
   <https://docs.flathub.org/docs/for-app-authors/submission>.

> ⚠️ The manifest's `build-commands` are a working starting point but the
> from-source Electron build usually needs a couple of local iterations with
> `flatpak-builder` (offline install wiring, the electron binary path) before
> it's green. Get step 3 building locally before opening the PR.
