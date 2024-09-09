CMS.registerWidget('update-size', createClass({
  handleClick() {
    console.log('Button clicked');

    const mainDownload = this.props.entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;
    console.log('PlistUrl:', plistUrl);

    if (!plistUrl) {
      console.log('No plistUrl found');
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    console.log('Calling API with URL:', plistUrl);
    fetch(`/api/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => {
        console.log('API response received');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log('API data:', data);
        if (data.size) {
          console.log('Updating size:', data.size);
          
          // Update the 'size' field
          this.props.onChange(this.props.entry.get('data').set('size', data.size));
          
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          console.log('No size data received');
          alert('Không thể lấy kích thước file.');
        }
      })
      .catch(error => {
        console.error('Error in API call:', error);
        alert('Có lỗi xảy ra khi cập nhật kích thước: ' + error.message);
      });
  },
  render() {
    const currentSize = this.props.entry.getIn(['data', 'size']) || '';
    console.log('Current size:', currentSize);
    return h('div', {},
      h('button', { type: 'button', onClick: this.handleClick }, 'Cập nhật kích thước'),
      currentSize ? h('span', {}, ` Kích thước hiện tại: ${currentSize}`) : null
    );
  }
}));

CMS.init();