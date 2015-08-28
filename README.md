# Unified Solutions Hub

**A webapp that forms the center of the Unified Solutions system. At the moment all it does is allow Support Notesbooks to be emailed to support., but its role will be expanded in future versions**

Two email addresses supported (one for successful problem resolutions, one for those who want more help).

## Technologies

Uses:

* Silex
* Symphony Components
* Swift Mailer
* Twig
* CORS (for cross-domain AJAX)

Built-in test harness @ /mail uses Foundation 5

## Config

See config/prod.yml

This YAML file allows you to set the recipient emails addresses and acceptable access doamin for CORS.
