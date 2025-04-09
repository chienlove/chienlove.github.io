CMS.registerPreviewCard("post-card", {
  label: "Bài viết",
  render: ({ entry, fieldsMetaData }) => `
    <div style="padding: 16px; border: 1px solid #eee; border-radius: 8px;">
      <h3 style="margin-top: 0;">${entry.getIn(['data', 'title'])}</h3>
      <p>${entry.getIn(['data', 'description']) || 'Không có mô tả'}</p>
    </div>
  `
});