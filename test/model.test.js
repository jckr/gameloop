/**
 * @jest-environment jsdom
 */
const { Model } = require('../dist/index.js');

function incrementerInitData() {
  return 0;
}

function incrementerUpdateData({data}) {
  return (data || 0) + 1;
}

let incrementer;
describe('tests for core Model', () => {
  beforeEach(() => {
    incrementer = new Model({maxTime: 10, initData: incrementerInitData, updateData: incrementerUpdateData});
  });
  it('Model can be created', () => {
    expect(incrementer['state'].data).toBe(0);
  });
  it('Model data is updated manually', () => {
    incrementer.setTick(5);
    expect(incrementer['state'].data).toBe(5);
  });
  it('Model can update automatically', () => {
    incrementer.play();
    expect(incrementer['state'].isPlaying).toBe(true);
  });
  it('auto-updating model can be stopped', () => {
    incrementer.play();
    expect(incrementer['state'].isPlaying).toBe(true);
    incrementer.stop();
    expect(incrementer['state'].isPlaying).toBe(false);
  });
  it('model will stop auto-updating when tick reaches maxTime', () => {
    incrementer.play();
    setTimeout(() => {
      expect(incrementer['state'].tick).toBe(10);
      expect(incrementer['state'].isPlaying).toBe(false);
      expect(incrementer['state'].canPlay).toBe(false);
    }, 100)
  });
});
