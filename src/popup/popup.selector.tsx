import { createSelector } from "@reduxjs/toolkit";
import { RootState } from "./store";
import { BuuGuiProps } from "../states/states";

export const getKhachHangs = (state: RootState) => state.popup.khachHangList;
export const getSelectedKH = (state: RootState) => state.popup.selectedKH;
export const getSelectedBG = (state: RootState) => state.popup.selectedBG;
export const getCheckOption = (state: RootState) => state.popup.checkOption;
export const getBGFilled = createSelector(
  getSelectedKH,
  getCheckOption,
  (kh, check) => {
    const bgs: BuuGuiProps[] | undefined = kh?.BuuGuis.filter((bg) => {
      if (check.includes(0) && bg.TrangThai === "Đang đi thu gom") {
        return true;
      } else if (check.includes(1) && bg.TrangThai === "Đã phân hướng") {
        return true;
      } else if (check.includes(2) && bg.TrangThai === "Nhận hàng thành công") {
        return true;
      } else if (check.includes(3) && bg.TrangThai === "Đã chấp nhận") {
        return true;
      }
      return false;
    });
    return bgs;
  }
);
