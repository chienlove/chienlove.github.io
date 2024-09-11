CMS.registerWidget('update-size', createClass({
  getInitialState() {
    return {
      loading: false,
      plistUrl: '', // Lưu trạng thái của plistUrl
    };
  },

  handleClick() {
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const plistUrl = mainDownload ? mainDownload.get('plistUrl') : null;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trong phần "Liên kết tải xuống chính".');
      return;
    }

    // Lưu trạng thái plistUrl
    this.setState({ plistUrl }, () => {
      this.setState({ loading: true });

      // Gọi API để lấy kích thước IPA từ plistUrl sau khi đã lưu
      fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(this.state.plistUrl)}`)
        .then(response => response.json())
        .then(data => {
          if (data.size) {
            this.props.onChange(data.size);  // Cập nhật kích thước file trong CMS
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
    });
  },

  render() {
    const loading = this.state.loading;

    // Không hiển thị khung nhập cho URL plist nữa
    return h('div', { className: 'size-update-widget', style: { display: 'flex', alignItems: 'center' } },
      h('button', { 
        type: 'button', 
        onClick: this.handleClick.bind(this),  // Bấm nút để cập nhật kích thước
        disabled: loading,
        style: { padding: '5px 10px' }
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước')
    );
  }
}));
CMS.init();
