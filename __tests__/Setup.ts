/**
 * @Author: Ondrej Mikulas <ondrej.mikulas@technologystudio.sk>
 * @Date: 2020-07-31T12:07:89+02:00
 * @Copyright: Technology Studio
**/

import { configure } from 'enzyme'
import Adapter from 'enzyme-adapter-react-16'

import './Config/LogConfig'

configure({ adapter: new Adapter() })

// Mock your external modules here if needed
// jest
// .mock('package', () => {
//   return { isTablet: jest.fn(() => { return false }) }
// })
