export interface CountryCode {

  code: string;

  name: string;

  nameCn: string;

  dialCode: string;

  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [

  { code: 'CN', name: 'China', nameCn: '中国', dialCode: '86', flag: '🇨🇳' },
  { code: 'US', name: 'United States', nameCn: '美国', dialCode: '1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameCn: '英国', dialCode: '44', flag: '🇬🇧' },
  { code: 'JP', name: 'Japan', nameCn: '日本', dialCode: '81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', nameCn: '韩国', dialCode: '82', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', nameCn: '新加坡', dialCode: '65', flag: '🇸🇬' },
  { code: 'HK', name: 'Hong Kong', nameCn: '中国香港', dialCode: '852', flag: '🇭🇰' },
  { code: 'TW', name: 'Taiwan', nameCn: '中国台湾', dialCode: '886', flag: '🇨🇳' },
  { code: 'MO', name: 'Macau', nameCn: '中国澳门', dialCode: '853', flag: '🇲🇴' },
  { code: 'AU', name: 'Australia', nameCn: '澳大利亚', dialCode: '61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', nameCn: '加拿大', dialCode: '1', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', nameCn: '德国', dialCode: '49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', nameCn: '法国', dialCode: '33', flag: '🇫🇷' },

  // A
  { code: 'AF', name: 'Afghanistan', nameCn: '阿富汗', dialCode: '93', flag: '🇦🇫' },
  { code: 'AL', name: 'Albania', nameCn: '阿尔巴尼亚', dialCode: '355', flag: '🇦🇱' },
  { code: 'DZ', name: 'Algeria', nameCn: '阿尔及利亚', dialCode: '213', flag: '🇩🇿' },
  { code: 'AS', name: 'American Samoa', nameCn: '美属萨摩亚', dialCode: '1684', flag: '🇦🇸' },
  { code: 'AD', name: 'Andorra', nameCn: '安道尔', dialCode: '376', flag: '🇦🇩' },
  { code: 'AO', name: 'Angola', nameCn: '安哥拉', dialCode: '244', flag: '🇦🇴' },
  { code: 'AI', name: 'Anguilla', nameCn: '安圭拉', dialCode: '1264', flag: '🇦🇮' },
  { code: 'AG', name: 'Antigua and Barbuda', nameCn: '安提瓜和巴布达', dialCode: '1268', flag: '🇦🇬' },
  { code: 'AR', name: 'Argentina', nameCn: '阿根廷', dialCode: '54', flag: '🇦🇷' },
  { code: 'AM', name: 'Armenia', nameCn: '亚美尼亚', dialCode: '374', flag: '🇦🇲' },
  { code: 'AW', name: 'Aruba', nameCn: '阿鲁巴', dialCode: '297', flag: '🇦🇼' },
  { code: 'AT', name: 'Austria', nameCn: '奥地利', dialCode: '43', flag: '🇦🇹' },
  { code: 'AZ', name: 'Azerbaijan', nameCn: '阿塞拜疆', dialCode: '994', flag: '🇦🇿' },

  // B
  { code: 'BS', name: 'Bahamas', nameCn: '巴哈马', dialCode: '1242', flag: '🇧🇸' },
  { code: 'BH', name: 'Bahrain', nameCn: '巴林', dialCode: '973', flag: '🇧🇭' },
  { code: 'BD', name: 'Bangladesh', nameCn: '孟加拉国', dialCode: '880', flag: '🇧🇩' },
  { code: 'BB', name: 'Barbados', nameCn: '巴巴多斯', dialCode: '1246', flag: '🇧🇧' },
  { code: 'BY', name: 'Belarus', nameCn: '白俄罗斯', dialCode: '375', flag: '🇧🇾' },
  { code: 'BE', name: 'Belgium', nameCn: '比利时', dialCode: '32', flag: '🇧🇪' },
  { code: 'BZ', name: 'Belize', nameCn: '伯利兹', dialCode: '501', flag: '🇧🇿' },
  { code: 'BJ', name: 'Benin', nameCn: '贝宁', dialCode: '229', flag: '🇧🇯' },
  { code: 'BM', name: 'Bermuda', nameCn: '百慕大', dialCode: '1441', flag: '🇧🇲' },
  { code: 'BT', name: 'Bhutan', nameCn: '不丹', dialCode: '975', flag: '🇧🇹' },
  { code: 'BO', name: 'Bolivia', nameCn: '玻利维亚', dialCode: '591', flag: '🇧🇴' },
  { code: 'BA', name: 'Bosnia and Herzegovina', nameCn: '波斯尼亚和黑塞哥维那', dialCode: '387', flag: '🇧🇦' },
  { code: 'BW', name: 'Botswana', nameCn: '博茨瓦纳', dialCode: '267', flag: '🇧🇼' },
  { code: 'BR', name: 'Brazil', nameCn: '巴西', dialCode: '55', flag: '🇧🇷' },
  { code: 'BN', name: 'Brunei', nameCn: '文莱', dialCode: '673', flag: '🇧🇳' },
  { code: 'BG', name: 'Bulgaria', nameCn: '保加利亚', dialCode: '359', flag: '🇧🇬' },
  { code: 'BF', name: 'Burkina Faso', nameCn: '布基纳法索', dialCode: '226', flag: '🇧🇫' },
  { code: 'BI', name: 'Burundi', nameCn: '布隆迪', dialCode: '257', flag: '🇧🇮' },

  // C
  { code: 'KH', name: 'Cambodia', nameCn: '柬埔寨', dialCode: '855', flag: '🇰🇭' },
  { code: 'CM', name: 'Cameroon', nameCn: '喀麦隆', dialCode: '237', flag: '🇨🇲' },
  { code: 'CV', name: 'Cape Verde', nameCn: '佛得角', dialCode: '238', flag: '🇨🇻' },
  { code: 'KY', name: 'Cayman Islands', nameCn: '开曼群岛', dialCode: '1345', flag: '🇰🇾' },
  { code: 'CF', name: 'Central African Republic', nameCn: '中非共和国', dialCode: '236', flag: '🇨🇫' },
  { code: 'TD', name: 'Chad', nameCn: '乍得', dialCode: '235', flag: '🇹🇩' },
  { code: 'CL', name: 'Chile', nameCn: '智利', dialCode: '56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', nameCn: '哥伦比亚', dialCode: '57', flag: '🇨🇴' },
  { code: 'KM', name: 'Comoros', nameCn: '科摩罗', dialCode: '269', flag: '🇰🇲' },
  { code: 'CG', name: 'Congo', nameCn: '刚果（布）', dialCode: '242', flag: '🇨🇬' },
  { code: 'CD', name: 'Congo (DRC)', nameCn: '刚果（金）', dialCode: '243', flag: '🇨🇩' },
  { code: 'CK', name: 'Cook Islands', nameCn: '库克群岛', dialCode: '682', flag: '🇨🇰' },
  { code: 'CR', name: 'Costa Rica', nameCn: '哥斯达黎加', dialCode: '506', flag: '🇨🇷' },
  { code: 'CI', name: 'Côte d\'Ivoire', nameCn: '科特迪瓦', dialCode: '225', flag: '🇨🇮' },
  { code: 'HR', name: 'Croatia', nameCn: '克罗地亚', dialCode: '385', flag: '🇭🇷' },
  { code: 'CU', name: 'Cuba', nameCn: '古巴', dialCode: '53', flag: '🇨🇺' },
  { code: 'CW', name: 'Curaçao', nameCn: '库拉索', dialCode: '599', flag: '🇨🇼' },
  { code: 'CY', name: 'Cyprus', nameCn: '塞浦路斯', dialCode: '357', flag: '🇨🇾' },
  { code: 'CZ', name: 'Czech Republic', nameCn: '捷克', dialCode: '420', flag: '🇨🇿' },

  // D
  { code: 'DK', name: 'Denmark', nameCn: '丹麦', dialCode: '45', flag: '🇩🇰' },
  { code: 'DJ', name: 'Djibouti', nameCn: '吉布提', dialCode: '253', flag: '🇩🇯' },
  { code: 'DM', name: 'Dominica', nameCn: '多米尼克', dialCode: '1767', flag: '🇩🇲' },
  { code: 'DO', name: 'Dominican Republic', nameCn: '多米尼加', dialCode: '1809', flag: '🇩🇴' },

  // E
  { code: 'EC', name: 'Ecuador', nameCn: '厄瓜多尔', dialCode: '593', flag: '🇪🇨' },
  { code: 'EG', name: 'Egypt', nameCn: '埃及', dialCode: '20', flag: '🇪🇬' },
  { code: 'SV', name: 'El Salvador', nameCn: '萨尔瓦多', dialCode: '503', flag: '🇸🇻' },
  { code: 'GQ', name: 'Equatorial Guinea', nameCn: '赤道几内亚', dialCode: '240', flag: '🇬🇶' },
  { code: 'ER', name: 'Eritrea', nameCn: '厄立特里亚', dialCode: '291', flag: '🇪🇷' },
  { code: 'EE', name: 'Estonia', nameCn: '爱沙尼亚', dialCode: '372', flag: '🇪🇪' },
  { code: 'SZ', name: 'Eswatini', nameCn: '斯威士兰', dialCode: '268', flag: '🇸🇿' },
  { code: 'ET', name: 'Ethiopia', nameCn: '埃塞俄比亚', dialCode: '251', flag: '🇪🇹' },

  // F
  { code: 'FK', name: 'Falkland Islands', nameCn: '福克兰群岛', dialCode: '500', flag: '🇫🇰' },
  { code: 'FO', name: 'Faroe Islands', nameCn: '法罗群岛', dialCode: '298', flag: '🇫🇴' },
  { code: 'FJ', name: 'Fiji', nameCn: '斐济', dialCode: '679', flag: '🇫🇯' },
  { code: 'FI', name: 'Finland', nameCn: '芬兰', dialCode: '358', flag: '🇫🇮' },
  { code: 'GF', name: 'French Guiana', nameCn: '法属圭亚那', dialCode: '594', flag: '🇬🇫' },
  { code: 'PF', name: 'French Polynesia', nameCn: '法属波利尼西亚', dialCode: '689', flag: '🇵🇫' },

  // G
  { code: 'GA', name: 'Gabon', nameCn: '加蓬', dialCode: '241', flag: '🇬🇦' },
  { code: 'GM', name: 'Gambia', nameCn: '冈比亚', dialCode: '220', flag: '🇬🇲' },
  { code: 'GE', name: 'Georgia', nameCn: '格鲁吉亚', dialCode: '995', flag: '🇬🇪' },
  { code: 'GH', name: 'Ghana', nameCn: '加纳', dialCode: '233', flag: '🇬🇭' },
  { code: 'GI', name: 'Gibraltar', nameCn: '直布罗陀', dialCode: '350', flag: '🇬🇮' },
  { code: 'GR', name: 'Greece', nameCn: '希腊', dialCode: '30', flag: '🇬🇷' },
  { code: 'GL', name: 'Greenland', nameCn: '格陵兰', dialCode: '299', flag: '🇬🇱' },
  { code: 'GD', name: 'Grenada', nameCn: '格林纳达', dialCode: '1473', flag: '🇬🇩' },
  { code: 'GP', name: 'Guadeloupe', nameCn: '瓜德罗普', dialCode: '590', flag: '🇬🇵' },
  { code: 'GU', name: 'Guam', nameCn: '关岛', dialCode: '1671', flag: '🇬🇺' },
  { code: 'GT', name: 'Guatemala', nameCn: '危地马拉', dialCode: '502', flag: '🇬🇹' },
  { code: 'GG', name: 'Guernsey', nameCn: '根西岛', dialCode: '44', flag: '🇬🇬' },
  { code: 'GN', name: 'Guinea', nameCn: '几内亚', dialCode: '224', flag: '🇬🇳' },
  { code: 'GW', name: 'Guinea-Bissau', nameCn: '几内亚比绍', dialCode: '245', flag: '🇬🇼' },
  { code: 'GY', name: 'Guyana', nameCn: '圭亚那', dialCode: '592', flag: '🇬🇾' },

  // H
  { code: 'HT', name: 'Haiti', nameCn: '海地', dialCode: '509', flag: '🇭🇹' },
  { code: 'HN', name: 'Honduras', nameCn: '洪都拉斯', dialCode: '504', flag: '🇭🇳' },
  { code: 'HU', name: 'Hungary', nameCn: '匈牙利', dialCode: '36', flag: '🇭🇺' },

  // I
  { code: 'IS', name: 'Iceland', nameCn: '冰岛', dialCode: '354', flag: '🇮🇸' },
  { code: 'IN', name: 'India', nameCn: '印度', dialCode: '91', flag: '🇮🇳' },
  { code: 'ID', name: 'Indonesia', nameCn: '印度尼西亚', dialCode: '62', flag: '🇮🇩' },
  { code: 'IR', name: 'Iran', nameCn: '伊朗', dialCode: '98', flag: '🇮🇷' },
  { code: 'IQ', name: 'Iraq', nameCn: '伊拉克', dialCode: '964', flag: '🇮🇶' },
  { code: 'IE', name: 'Ireland', nameCn: '爱尔兰', dialCode: '353', flag: '🇮🇪' },
  { code: 'IM', name: 'Isle of Man', nameCn: '马恩岛', dialCode: '44', flag: '🇮🇲' },
  { code: 'IL', name: 'Israel', nameCn: '以色列', dialCode: '972', flag: '🇮🇱' },
  { code: 'IT', name: 'Italy', nameCn: '意大利', dialCode: '39', flag: '🇮🇹' },

  // J
  { code: 'JM', name: 'Jamaica', nameCn: '牙买加', dialCode: '1876', flag: '🇯🇲' },
  { code: 'JE', name: 'Jersey', nameCn: '泽西岛', dialCode: '44', flag: '🇯🇪' },
  { code: 'JO', name: 'Jordan', nameCn: '约旦', dialCode: '962', flag: '🇯🇴' },

  // K
  { code: 'KZ', name: 'Kazakhstan', nameCn: '哈萨克斯坦', dialCode: '7', flag: '🇰🇿' },
  { code: 'KE', name: 'Kenya', nameCn: '肯尼亚', dialCode: '254', flag: '🇰🇪' },
  { code: 'KI', name: 'Kiribati', nameCn: '基里巴斯', dialCode: '686', flag: '🇰🇮' },
  { code: 'KP', name: 'North Korea', nameCn: '朝鲜', dialCode: '850', flag: '🇰🇵' },
  { code: 'KW', name: 'Kuwait', nameCn: '科威特', dialCode: '965', flag: '🇰🇼' },
  { code: 'KG', name: 'Kyrgyzstan', nameCn: '吉尔吉斯斯坦', dialCode: '996', flag: '🇰🇬' },

  // L
  { code: 'LA', name: 'Laos', nameCn: '老挝', dialCode: '856', flag: '🇱🇦' },
  { code: 'LV', name: 'Latvia', nameCn: '拉脱维亚', dialCode: '371', flag: '🇱🇻' },
  { code: 'LB', name: 'Lebanon', nameCn: '黎巴嫩', dialCode: '961', flag: '🇱🇧' },
  { code: 'LS', name: 'Lesotho', nameCn: '莱索托', dialCode: '266', flag: '🇱🇸' },
  { code: 'LR', name: 'Liberia', nameCn: '利比里亚', dialCode: '231', flag: '🇱🇷' },
  { code: 'LY', name: 'Libya', nameCn: '利比亚', dialCode: '218', flag: '🇱🇾' },
  { code: 'LI', name: 'Liechtenstein', nameCn: '列支敦士登', dialCode: '423', flag: '🇱🇮' },
  { code: 'LT', name: 'Lithuania', nameCn: '立陶宛', dialCode: '370', flag: '🇱🇹' },
  { code: 'LU', name: 'Luxembourg', nameCn: '卢森堡', dialCode: '352', flag: '🇱🇺' },

  // M
  { code: 'MK', name: 'North Macedonia', nameCn: '北马其顿', dialCode: '389', flag: '🇲🇰' },
  { code: 'MG', name: 'Madagascar', nameCn: '马达加斯加', dialCode: '261', flag: '🇲🇬' },
  { code: 'MW', name: 'Malawi', nameCn: '马拉维', dialCode: '265', flag: '🇲🇼' },
  { code: 'MY', name: 'Malaysia', nameCn: '马来西亚', dialCode: '60', flag: '🇲🇾' },
  { code: 'MV', name: 'Maldives', nameCn: '马尔代夫', dialCode: '960', flag: '🇲🇻' },
  { code: 'ML', name: 'Mali', nameCn: '马里', dialCode: '223', flag: '🇲🇱' },
  { code: 'MT', name: 'Malta', nameCn: '马耳他', dialCode: '356', flag: '🇲🇹' },
  { code: 'MH', name: 'Marshall Islands', nameCn: '马绍尔群岛', dialCode: '692', flag: '🇲🇭' },
  { code: 'MQ', name: 'Martinique', nameCn: '马提尼克', dialCode: '596', flag: '🇲🇶' },
  { code: 'MR', name: 'Mauritania', nameCn: '毛里塔尼亚', dialCode: '222', flag: '🇲🇷' },
  { code: 'MU', name: 'Mauritius', nameCn: '毛里求斯', dialCode: '230', flag: '🇲🇺' },
  { code: 'YT', name: 'Mayotte', nameCn: '马约特', dialCode: '262', flag: '🇾🇹' },
  { code: 'MX', name: 'Mexico', nameCn: '墨西哥', dialCode: '52', flag: '🇲🇽' },
  { code: 'FM', name: 'Micronesia', nameCn: '密克罗尼西亚', dialCode: '691', flag: '🇫🇲' },
  { code: 'MD', name: 'Moldova', nameCn: '摩尔多瓦', dialCode: '373', flag: '🇲🇩' },
  { code: 'MC', name: 'Monaco', nameCn: '摩纳哥', dialCode: '377', flag: '🇲🇨' },
  { code: 'MN', name: 'Mongolia', nameCn: '蒙古', dialCode: '976', flag: '🇲🇳' },
  { code: 'ME', name: 'Montenegro', nameCn: '黑山', dialCode: '382', flag: '🇲🇪' },
  { code: 'MS', name: 'Montserrat', nameCn: '蒙特塞拉特', dialCode: '1664', flag: '🇲🇸' },
  { code: 'MA', name: 'Morocco', nameCn: '摩洛哥', dialCode: '212', flag: '🇲🇦' },
  { code: 'MZ', name: 'Mozambique', nameCn: '莫桑比克', dialCode: '258', flag: '🇲🇿' },
  { code: 'MM', name: 'Myanmar', nameCn: '缅甸', dialCode: '95', flag: '🇲🇲' },

  // N
  { code: 'NA', name: 'Namibia', nameCn: '纳米比亚', dialCode: '264', flag: '🇳🇦' },
  { code: 'NR', name: 'Nauru', nameCn: '瑙鲁', dialCode: '674', flag: '🇳🇷' },
  { code: 'NP', name: 'Nepal', nameCn: '尼泊尔', dialCode: '977', flag: '🇳🇵' },
  { code: 'NL', name: 'Netherlands', nameCn: '荷兰', dialCode: '31', flag: '🇳🇱' },
  { code: 'NC', name: 'New Caledonia', nameCn: '新喀里多尼亚', dialCode: '687', flag: '🇳🇨' },
  { code: 'NZ', name: 'New Zealand', nameCn: '新西兰', dialCode: '64', flag: '🇳🇿' },
  { code: 'NI', name: 'Nicaragua', nameCn: '尼加拉瓜', dialCode: '505', flag: '🇳🇮' },
  { code: 'NE', name: 'Niger', nameCn: '尼日尔', dialCode: '227', flag: '🇳🇪' },
  { code: 'NG', name: 'Nigeria', nameCn: '尼日利亚', dialCode: '234', flag: '🇳🇬' },
  { code: 'NU', name: 'Niue', nameCn: '纽埃', dialCode: '683', flag: '🇳🇺' },
  { code: 'NF', name: 'Norfolk Island', nameCn: '诺福克岛', dialCode: '672', flag: '🇳🇫' },
  { code: 'MP', name: 'Northern Mariana Islands', nameCn: '北马里亚纳群岛', dialCode: '1670', flag: '🇲🇵' },
  { code: 'NO', name: 'Norway', nameCn: '挪威', dialCode: '47', flag: '🇳🇴' },

  // O
  { code: 'OM', name: 'Oman', nameCn: '阿曼', dialCode: '968', flag: '🇴🇲' },

  // P
  { code: 'PK', name: 'Pakistan', nameCn: '巴基斯坦', dialCode: '92', flag: '🇵🇰' },
  { code: 'PW', name: 'Palau', nameCn: '帕劳', dialCode: '680', flag: '🇵🇼' },
  { code: 'PS', name: 'Palestine', nameCn: '巴勒斯坦', dialCode: '970', flag: '🇵🇸' },
  { code: 'PA', name: 'Panama', nameCn: '巴拿马', dialCode: '507', flag: '🇵🇦' },
  { code: 'PG', name: 'Papua New Guinea', nameCn: '巴布亚新几内亚', dialCode: '675', flag: '🇵🇬' },
  { code: 'PY', name: 'Paraguay', nameCn: '巴拉圭', dialCode: '595', flag: '🇵🇾' },
  { code: 'PE', name: 'Peru', nameCn: '秘鲁', dialCode: '51', flag: '🇵🇪' },
  { code: 'PH', name: 'Philippines', nameCn: '菲律宾', dialCode: '63', flag: '🇵🇭' },
  { code: 'PL', name: 'Poland', nameCn: '波兰', dialCode: '48', flag: '🇵🇱' },
  { code: 'PT', name: 'Portugal', nameCn: '葡萄牙', dialCode: '351', flag: '🇵🇹' },
  { code: 'PR', name: 'Puerto Rico', nameCn: '波多黎各', dialCode: '1787', flag: '🇵🇷' },

  // Q
  { code: 'QA', name: 'Qatar', nameCn: '卡塔尔', dialCode: '974', flag: '🇶🇦' },

  // R
  { code: 'RE', name: 'Réunion', nameCn: '留尼汪', dialCode: '262', flag: '🇷🇪' },
  { code: 'RO', name: 'Romania', nameCn: '罗马尼亚', dialCode: '40', flag: '🇷🇴' },
  { code: 'RU', name: 'Russia', nameCn: '俄罗斯', dialCode: '7', flag: '🇷🇺' },
  { code: 'RW', name: 'Rwanda', nameCn: '卢旺达', dialCode: '250', flag: '🇷🇼' },

  // S
  { code: 'BL', name: 'Saint Barthélemy', nameCn: '圣巴泰勒米', dialCode: '590', flag: '🇧🇱' },
  { code: 'SH', name: 'Saint Helena', nameCn: '圣赫勒拿', dialCode: '290', flag: '🇸🇭' },
  { code: 'KN', name: 'Saint Kitts and Nevis', nameCn: '圣基茨和尼维斯', dialCode: '1869', flag: '🇰🇳' },
  { code: 'LC', name: 'Saint Lucia', nameCn: '圣卢西亚', dialCode: '1758', flag: '🇱🇨' },
  { code: 'MF', name: 'Saint Martin', nameCn: '圣马丁（法属）', dialCode: '590', flag: '🇲🇫' },
  { code: 'PM', name: 'Saint Pierre and Miquelon', nameCn: '圣皮埃尔和密克隆', dialCode: '508', flag: '🇵🇲' },
  { code: 'VC', name: 'Saint Vincent and the Grenadines', nameCn: '圣文森特和格林纳丁斯', dialCode: '1784', flag: '🇻🇨' },
  { code: 'WS', name: 'Samoa', nameCn: '萨摩亚', dialCode: '685', flag: '🇼🇸' },
  { code: 'SM', name: 'San Marino', nameCn: '圣马力诺', dialCode: '378', flag: '🇸🇲' },
  { code: 'ST', name: 'São Tomé and Príncipe', nameCn: '圣多美和普林西比', dialCode: '239', flag: '🇸🇹' },
  { code: 'SA', name: 'Saudi Arabia', nameCn: '沙特阿拉伯', dialCode: '966', flag: '🇸🇦' },
  { code: 'SN', name: 'Senegal', nameCn: '塞内加尔', dialCode: '221', flag: '🇸🇳' },
  { code: 'RS', name: 'Serbia', nameCn: '塞尔维亚', dialCode: '381', flag: '🇷🇸' },
  { code: 'SC', name: 'Seychelles', nameCn: '塞舌尔', dialCode: '248', flag: '🇸🇨' },
  { code: 'SL', name: 'Sierra Leone', nameCn: '塞拉利昂', dialCode: '232', flag: '🇸🇱' },
  { code: 'SX', name: 'Sint Maarten', nameCn: '圣马丁（荷属）', dialCode: '1721', flag: '🇸🇽' },
  { code: 'SK', name: 'Slovakia', nameCn: '斯洛伐克', dialCode: '421', flag: '🇸🇰' },
  { code: 'SI', name: 'Slovenia', nameCn: '斯洛文尼亚', dialCode: '386', flag: '🇸🇮' },
  { code: 'SB', name: 'Solomon Islands', nameCn: '所罗门群岛', dialCode: '677', flag: '🇸🇧' },
  { code: 'SO', name: 'Somalia', nameCn: '索马里', dialCode: '252', flag: '🇸🇴' },
  { code: 'ZA', name: 'South Africa', nameCn: '南非', dialCode: '27', flag: '🇿🇦' },
  { code: 'SS', name: 'South Sudan', nameCn: '南苏丹', dialCode: '211', flag: '🇸🇸' },
  { code: 'ES', name: 'Spain', nameCn: '西班牙', dialCode: '34', flag: '🇪🇸' },
  { code: 'LK', name: 'Sri Lanka', nameCn: '斯里兰卡', dialCode: '94', flag: '🇱🇰' },
  { code: 'SD', name: 'Sudan', nameCn: '苏丹', dialCode: '249', flag: '🇸🇩' },
  { code: 'SR', name: 'Suriname', nameCn: '苏里南', dialCode: '597', flag: '🇸🇷' },
  { code: 'SE', name: 'Sweden', nameCn: '瑞典', dialCode: '46', flag: '🇸🇪' },
  { code: 'CH', name: 'Switzerland', nameCn: '瑞士', dialCode: '41', flag: '🇨🇭' },
  { code: 'SY', name: 'Syria', nameCn: '叙利亚', dialCode: '963', flag: '🇸🇾' },

  // T
  { code: 'TJ', name: 'Tajikistan', nameCn: '塔吉克斯坦', dialCode: '992', flag: '🇹🇯' },
  { code: 'TZ', name: 'Tanzania', nameCn: '坦桑尼亚', dialCode: '255', flag: '🇹🇿' },
  { code: 'TH', name: 'Thailand', nameCn: '泰国', dialCode: '66', flag: '🇹🇭' },
  { code: 'TL', name: 'Timor-Leste', nameCn: '东帝汶', dialCode: '670', flag: '🇹🇱' },
  { code: 'TG', name: 'Togo', nameCn: '多哥', dialCode: '228', flag: '🇹🇬' },
  { code: 'TK', name: 'Tokelau', nameCn: '托克劳', dialCode: '690', flag: '🇹🇰' },
  { code: 'TO', name: 'Tonga', nameCn: '汤加', dialCode: '676', flag: '🇹🇴' },
  { code: 'TT', name: 'Trinidad and Tobago', nameCn: '特立尼达和多巴哥', dialCode: '1868', flag: '🇹🇹' },
  { code: 'TN', name: 'Tunisia', nameCn: '突尼斯', dialCode: '216', flag: '🇹🇳' },
  { code: 'TR', name: 'Turkey', nameCn: '土耳其', dialCode: '90', flag: '🇹🇷' },
  { code: 'TM', name: 'Turkmenistan', nameCn: '土库曼斯坦', dialCode: '993', flag: '🇹🇲' },
  { code: 'TC', name: 'Turks and Caicos Islands', nameCn: '特克斯和凯科斯群岛', dialCode: '1649', flag: '🇹🇨' },
  { code: 'TV', name: 'Tuvalu', nameCn: '图瓦卢', dialCode: '688', flag: '🇹🇻' },

  // U
  { code: 'UG', name: 'Uganda', nameCn: '乌干达', dialCode: '256', flag: '🇺🇬' },
  { code: 'UA', name: 'Ukraine', nameCn: '乌克兰', dialCode: '380', flag: '🇺🇦' },
  { code: 'AE', name: 'United Arab Emirates', nameCn: '阿联酋', dialCode: '971', flag: '🇦🇪' },
  { code: 'UY', name: 'Uruguay', nameCn: '乌拉圭', dialCode: '598', flag: '🇺🇾' },
  { code: 'UZ', name: 'Uzbekistan', nameCn: '乌兹别克斯坦', dialCode: '998', flag: '🇺🇿' },

  // V
  { code: 'VU', name: 'Vanuatu', nameCn: '瓦努阿图', dialCode: '678', flag: '🇻🇺' },
  { code: 'VA', name: 'Vatican City', nameCn: '梵蒂冈', dialCode: '379', flag: '🇻🇦' },
  { code: 'VE', name: 'Venezuela', nameCn: '委内瑞拉', dialCode: '58', flag: '🇻🇪' },
  { code: 'VN', name: 'Vietnam', nameCn: '越南', dialCode: '84', flag: '🇻🇳' },
  { code: 'VG', name: 'British Virgin Islands', nameCn: '英属维尔京群岛', dialCode: '1284', flag: '🇻🇬' },
  { code: 'VI', name: 'U.S. Virgin Islands', nameCn: '美属维尔京群岛', dialCode: '1340', flag: '🇻🇮' },

  // W
  { code: 'WF', name: 'Wallis and Futuna', nameCn: '瓦利斯和富图纳', dialCode: '681', flag: '🇼🇫' },

  // Y
  { code: 'YE', name: 'Yemen', nameCn: '也门', dialCode: '967', flag: '🇾🇪' },

  // Z
  { code: 'ZM', name: 'Zambia', nameCn: '赞比亚', dialCode: '260', flag: '🇿🇲' },
  { code: 'ZW', name: 'Zimbabwe', nameCn: '津巴布韦', dialCode: '263', flag: '🇿🇼' },
];

export function getCountryByCode(code: string): CountryCode | undefined {
  return COUNTRY_CODES.find(country => country.code === code.toUpperCase());
}

export function getCountriesByDialCode(dialCode: string): CountryCode[] {
  return COUNTRY_CODES.filter(country => country.dialCode === dialCode);
}

export function getAllCountries(): CountryCode[] {
  return COUNTRY_CODES;
}

export function searchCountries(query: string, language: 'en' | 'zh' = 'en'): CountryCode[] {
  const lowerQuery = query.toLowerCase().trim();
  if (!lowerQuery) return COUNTRY_CODES;

  return COUNTRY_CODES.filter(country => {

    if (country.dialCode.includes(lowerQuery) || `+${country.dialCode}`.includes(lowerQuery)) {
      return true;
    }

    if (country.code.toLowerCase().includes(lowerQuery)) {
      return true;
    }

    if (language === 'zh') {
      return country.nameCn.includes(lowerQuery) || country.name.toLowerCase().includes(lowerQuery);
    }
    return country.name.toLowerCase().includes(lowerQuery) || country.nameCn.includes(lowerQuery);
  });
}

/** ISO country codes for mainland China + HK / MO / TW (CN edition SMS allowlist). */
export const GREATER_CHINA_COUNTRY_CODES = ['CN', 'HK', 'MO', 'TW'] as const;

export type GreaterChinaCountryCode = (typeof GREATER_CHINA_COUNTRY_CODES)[number];

export function getGreaterChinaCountries(): CountryCode[] {
  return GREATER_CHINA_COUNTRY_CODES
    .map((code) => getCountryByCode(code))
    .filter((country): country is CountryCode => Boolean(country));
}

/**
 * Validate national digits for a dial code (aligned with api phoneValidation KNOWN_REGIONS).
 */
export function validateNationalNumber(dialCode: string, national: string): boolean {
  const digits = national.replace(/\D/g, '');
  if (!digits) {
    return false;
  }
  if (dialCode === '86') {
    return /^1[3-9]\d{9}$/.test(digits);
  }
  if (dialCode === '852' || dialCode === '853') {
    return /^\d{8}$/.test(digits);
  }
  if (dialCode === '886') {
    return /^\d{8,10}$/.test(digits);
  }
  return /^\d{6,14}$/.test(digits);
}

export function formatPhoneNumber(dialCode: string, phoneNumber: string): string {

  const cleanNumber = phoneNumber.replace(/\D/g, '');
  return `+${dialCode}-${cleanNumber}`;
}

export function parsePhoneNumber(phoneNumber: string): { dialCode: string; number: string } | null {
  const match = phoneNumber.match(/^\+(\d{1,4})-(\d+)$/);
  if (match) {
    return { dialCode: match[1], number: match[2] };
  }
  return null;
}

export function getChinaCountry(): CountryCode {
  return COUNTRY_CODES[0]; 
}
