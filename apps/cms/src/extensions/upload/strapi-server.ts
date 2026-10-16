// AC-05: `populate[<media>][populate][related]` returns every document that
// uses the file, drafts included, with their full content. A private
// attribute is dropped from content-API output, populate and filters; the
// admin media library still sees it.
type UploadPlugin = { contentTypes: { file: { schema: { attributes: { related: { private?: boolean } } } } } };

export default (plugin: UploadPlugin) => {
  plugin.contentTypes.file.schema.attributes.related.private = true;
  return plugin;
};
