document.getElementById('app-form').addEventListener('submit', function(event) {
    event.preventDefault();

    // Lấy giá trị từ form
    const title = document.getElementById('title').value;
    const image = document.getElementById('image').value;
    const description = document.getElementById('description').value;
    const developer = document.getElementById('developer').value;
    const iosVersion = document.getElementById('iosVersion').value;
    const appVersion = document.getElementById('appVersion').value;
    const downloadLink = document.getElementById('downloadLink').value;
    const category = document.getElementById('category').value;

    // Tạo object mới từ dữ liệu form
    const newApp = {
        "title": title,
        "image": image,
        "description": description,
        "developer": developer,
        "iosVersion": iosVersion,
        "appVersion": appVersion,
        "downloadLink": downloadLink,
        "category": category
    };

    // Gửi dữ liệu đến server-side hoặc lưu trữ vào posts.json (trong trường hợp này, chỉ là ví dụ)
    fetch('posts.json', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(newApp)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to add app');
        }
        return response.json();
    })
    .then(data => {
        console.log('Success:', data);
        alert('App added successfully!');
        document.getElementById('app-form').reset(); // Đặt lại form sau khi thêm thành công
    })
    .catch(error => {
        console.error('Error:', error);
        alert('An error occurred while adding the app. Please try again.');
    });
});