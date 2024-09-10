CMS.registerWidget('update-size', createClass({
  handleClick() {
    const mainDownload = this.props.entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    this.setState({ loading: true });

    fetch(`/api/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.size) {
          // Update the 'size' field
          this.props.onChange(data.size);
          alert('Kích thước đã được cập nhật: ' + data.size);
        } else {
          throw new Error('Không nhận được dữ liệu kích thước từ API.');
        }
      })
      .catch(error => {
        console.error('Error in API call:', error);
        alert('Có lỗi xảy ra khi cập nhật kích thước: ' + error.message);
      })
      .finally(() => {
        this.setState({ loading: false });
      });
  },

  render() {
    const { value } = this.props;
    const loading = this.state?.loading;

    return h('div', {},
      h('button', { 
        type: 'button', 
        onClick: this.handleClick,
        disabled: loading 
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước'),
      value ? h('span', {}, ` Kích thước hiện tại: ${value}`) : null
    );
  }
}));

CMS.init();