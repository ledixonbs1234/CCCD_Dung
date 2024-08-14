import { PayloadAction, createSlice } from "@reduxjs/toolkit";
import { BuuGuiProps, KhachHangProps } from "../states/states";
export interface PopupState {
  khachHangList: KhachHangProps[];
  tenKH: string;
  selectedKH: KhachHangProps | null;
  selectedBG: BuuGuiProps | null;
  checkOption: number[]
}
const initialState: PopupState = {
  khachHangList: [],
  tenKH: "",
  selectedBG: null,
  selectedKH: null,
  checkOption: [0, 1, 2],
};
export const popupSlice = createSlice({
  name: "popup",
  initialState,
  reducers: {
    setKhachHangs: (state, action: PayloadAction<KhachHangProps[]>) => {
      action.payload.forEach((m) => {
        m.countState.countChapNhan = m.BuuGuis.filter(
          (m) => m.TrangThai === "Đã chấp nhận"
        ).length;
        m.countState.countDangGom = m.BuuGuis.filter(
          (m) => m.TrangThai === "Đang đi thu gom"
        ).length;
        m.countState.countNhanHang = m.BuuGuis.filter(
          (m) => m.TrangThai === "Nhận hàng thành công"
        ).length;
        m.countState.countPhanHuong = m.BuuGuis.filter(
          (m) => m.TrangThai === "Đã phân hướng"
        ).length;
      });
      state.khachHangList = action.payload;
      state.selectedKH = null
      state.selectedBG = null
    },
    setSelectedKH: (state, action: PayloadAction<KhachHangProps>) => {
      state.selectedKH = action.payload;
      state.selectedBG = null
      //thuc hien chuyen doi du lieu trong nay
    },
    setSelectedBG: (state, action: PayloadAction<BuuGuiProps>) => {
      state.selectedBG = action.payload;
    },
    clearData: (_state) => {
      _state = initialState;
    },
    setCheckChange: (state, action: PayloadAction<number[]>) => {
      state.checkOption = action.payload
    },
    sortNumber: (state) => {
      //thuc hien sort trong nay
      if (state.selectedKH?.BuuGuis) {
        const small = state.selectedKH?.BuuGuis.filter(m => Number(m.KhoiLuong) < 2000)
        const large = state.selectedKH?.BuuGuis.filter(m => Number(m.KhoiLuong) >= 2000)
        small.sort((a, b) => Number(b.MaBuuGui.substring(9, 11)) - Number(a.MaBuuGui.substring(9, 11)) || Number(b.MaBuuGui.substring(8, 9)) - Number(a.MaBuuGui.substring(8, 9)))
        large.sort((a, b) => Number(b.MaBuuGui.substring(9, 11)) - Number(a.MaBuuGui.substring(9, 11)) || Number(b.MaBuuGui.substring(8, 9)) - Number(a.MaBuuGui.substring(8, 9)))
        state.selectedKH.BuuGuis = large.concat(small)
        for (let i = 0; i < state.selectedKH?.BuuGuis?.length; i++) {
          state.selectedKH.BuuGuis[i].index = i + 1;
        }
        state.selectedBG = state.selectedKH.BuuGuis[0]
      }
    },
    sortWeight: (state) => {
      if (state.selectedKH?.BuuGuis) {
        state.selectedKH?.BuuGuis.sort((a, b) => Number(b.KhoiLuong) - Number(a.KhoiLuong))
        for (let i = 0; i < state.selectedKH?.BuuGuis?.length; i++) {
          state.selectedKH.BuuGuis[i].index = i + 1;
        }
        state.selectedBG = state.selectedKH.BuuGuis[0]
      }

    },
  },
});
export const { sortNumber, sortWeight, setKhachHangs, setCheckChange, clearData, setSelectedBG, setSelectedKH } =
  popupSlice.actions;
export default popupSlice.reducer;
