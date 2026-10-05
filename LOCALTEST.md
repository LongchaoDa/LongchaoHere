# Local Preview

This site is a Jekyll site. The local URL uses the repository `baseurl`, so the home page on this computer is:

```text
http://127.0.0.1:4000/LongchaoHere/
```

To preview from a phone on the same Wi-Fi, start the server with `--host 0.0.0.0` and open:

```text
http://YOUR_COMPUTER_IP:4000/LongchaoHere/
```

## One-time setup on macOS

Install the local tools:

```bash
brew install ruby@3.4 imagemagick
```

Use Homebrew Ruby for this shell session:

```bash
export PATH="/opt/homebrew/opt/ruby@3.4/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:/opt/homebrew/bin:$PATH"
```

Install the Bundler version from `Gemfile.lock`:

```bash
gem install bundler -v 2.5.14
```

Install the project gems locally:

```bash
bundle _2.5.14_ config set path vendor/bundle
bundle _2.5.14_ install
```

If Bundler adds your local macOS platform to `Gemfile.lock`, that is only for local dependency resolution. Review it before committing.

## Start the preview server

```bash
export PATH="/opt/homebrew/opt/ruby@3.4/bin:/opt/homebrew/lib/ruby/gems/3.4.0/bin:/opt/homebrew/bin:$PATH"
bundle _2.5.14_ exec jekyll serve \
  --config _config.yml,_config_local.yml \
  --host 0.0.0.0 \
  --port 4000 \
  --livereload
```

Open on this computer:

```text
http://127.0.0.1:4000/LongchaoHere/
```

For phone preview, find your Mac's Wi-Fi IP:

```bash
ipconfig getifaddr en0
```

Then open this on the phone, replacing the IP:

```text
http://YOUR_COMPUTER_IP:4000/LongchaoHere/
```

## Stop the server

Press `Ctrl-C` in the terminal where Jekyll is running.

## Notes

- `_config_local.yml` is only for local preview.
- It skips `assets/jupyter/` because that sample notebook requires a local `jupyter` command, while the home page preview does not.
- `vendor/bundle`, `_site`, `.bundle`, and Jekyll cache files are ignored by git.
