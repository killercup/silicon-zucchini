# Silicon Zucchini

_Silicon Zucchini_ is a simple and opinionated static site generator. It differentiates itself from similar tools by focussing on the usage of JSON Schema definitions for various tasks.

[![Build Status](https://travis-ci.org/killercup/silicon-zucchini.svg?branch=master)](https://travis-ci.org/killercup/silicon-zucchini)

## Current Features

- Read and validate data files
- Specify routes with data and template to be used
- Render underscore-based templates and partials with custom helper methods
- Validate template inputs

## JSON Schemas – What are they used for?

Honestly, you should better ask what they are not used for.

### Validate data files

_Silicon Zucchini_ reads your site's content and metadata from files. Each of these files can (and should) be valid according to a schema. This will prevent you from silently ignoring errors like missing fields (or even typos like `titel` instead of `title` for fields).

### Easily render CRUD interfaces for your data

Schemas make it fairly easy to create an interface to manage and edit you data. Just think about what combining [JSON Editor](https://github.com/jdorn/json-editor) with a small server could accomplish.

### Validate template input

Each template can (and should) define it's input parameters as JSON schema. This makes it impossible to forget to pass the needed data to a partials. Where other template engines are forgiving, _Silicon Zucchini_ is strict.

### Instant style guide with random demo data

Based on the types and restrictions defined in your schema, it is possible to generate demo data for your templates. This allows _Silicon Zucchini_ to easily create as style guide featuring all the partials and templates you defined. Better yet, it can generate endless variants and shows you how your design components might look with unexpected data!
