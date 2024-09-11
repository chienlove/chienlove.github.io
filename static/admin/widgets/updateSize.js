CMS.registerWidget('update-size', createClass({
  getInitialState() {
    const entry = this.props.entry;
    const mainDownload = entry.getIn(['data', 'main_download']);
    const initialPlistUrl = mainDownload ? mainDownload.get('plistUrl') : '';
    return { 
      loading: false,
      localPlistUrl: initialPlistUrl
    };
  },

  componentDidUpdate(prevProps) {
    if (prevProps.entry !== this.props.entry) {
      const mainDownload = this.props.entry.getIn(['data', 'main_download']);
      const plistUrl = mainDownload ? mainDownload.get('plistUrl') : '';
      this.setState({ localPlistUrl: plistUrl });
    }
  },

  handlePlistUrlChange(e) {
    this.setState({ localPlistUrl: e.target.value });
  },

  handleClick() {
    const plistUrl = this.state.localPlistUrl;

    if (!plistUrl) {
      alert('Vui lòng nhập URL plist trước khi cập nhật kích thước.');
      return;
    }

    this.setState({ loading: true });
    fetch(`/.netlify/functions/getIpaSize?url=${encodeURIComponent(plistUrl)}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        if (data.size) {
          // Cập nhật giá trị của trường size và plistUrl trong entry
          let newEntry = this.props.entry
            .setIn(['data', 'size'], data.size)
            .setIn(['data', 'main_download', 'plistUrl'], plistUrl);
          this.props.onChange(newEntry);
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
    const { loading, localPlistUrl } = this.state;
    const size = this.props.entry.getIn(['data', 'size']) || 'Chưa có kích thước';

    return h('div', {},
      h('input', {
        type: 'text',
        value: localPlistUrl,
        onChange: this.handlePlistUrlChange,
        placeholder: 'Nhập URL plist',
        style: { marginRight: '10px', width: '300px' }
      }),
      h('button', { 
        type: 'button', 
        onClick: this.handleClick,
        disabled: loading 
      }, loading ? 'Đang cập nhật...' : 'Cập nhật kích thước'),
      h('div', { style: { marginTop: '10px' } }, 
        `Kích thước hiện tại: ${size}`
      )
    );
  }
}));
CMS.init();