document.addEventListener("DOMContentLoaded", function() {
  // Ẩn phần xem trước
  const previewPane = document.querySelector('.nc-previewPane');
  if (previewPane) {
    previewPane.style.display = 'none';
  }

  // Thêm nút Sửa và Xóa vào danh sách bài viết
  const postItems = document.querySelectorAll('.nc-collectionPage-cardGrid-item');
  postItems.forEach(item => {
    if (!item.querySelector('.nc-collectionPage-cardGrid-item-actions')) {
      const actionsDiv = document.createElement('div');
      actionsDiv.classList.add('nc-collectionPage-cardGrid-item-actions');

      const editButton = document.createElement('button');
      editButton.classList.add('edit');
      editButton.textContent = 'Sửa';
      editButton.addEventListener('click', () => {
        // Logic sửa bài viết
        alert('Edit clicked for ' + item.querySelector('.nc-collectionPage-cardGrid-item-title').textContent);
      });

      const deleteButton = document.createElement('button');
      deleteButton.classList.add('delete');
      deleteButton.textContent = 'Xóa';
      deleteButton.addEventListener('click', () => {
        // Logic xóa bài viết
        alert('Delete clicked for ' + item.querySelector('.nc-collectionPage-cardGrid-item-title').textContent);
      });

      actionsDiv.appendChild(editButton);
      actionsDiv.appendChild(deleteButton);
      item.appendChild(actionsDiv);
    }
  });
});