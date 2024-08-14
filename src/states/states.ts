export type DataSnapshotProps = {
    Index: number,
    KhoiLuong: string,
    MaBuuGui: string,
    MaKH: string,
    MaTin: string,
    TenKH: string,
    TenNguoiGui: string,
    TimeNhanTin: string,
    TimeTrangThai: string,
    TrangThai: string
}

export type BuuGuiProps = {
    index : number,
    KhoiLuong : string
    MaBuuGui :string
    TrangThai:string
    TimeTrangThai: string,
}
export type KhachHangProps = {
    Index: number,
    BuuGuis: BuuGuiProps[],
    MaKH: string,
    MaTin: string,
    TenKH: string,
    TenNguoiGui: string,
    TimeNhanTin: string,
    countState: {
        countDangGom: number;
        countPhanHuong: number;
        countNhanHang: number;
        countChapNhan: number;
      };
}
export type DetailsProp = {
    details: KhachHangProps[]
}
export type KhachHangListProps = {
    name: string[],
    // handleClick : (event: React.MouseEvent<HTMLButtonElement>,id:number)=> {}
    onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void
}