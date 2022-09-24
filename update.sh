#!/bin/sh
function building() {
  echo "[" > all.pkgs
if [[ -e compatity.txt ]]; then
    compatity=$(cat compatity.txt)
fi

for i in Deb/*.deb
do
   debInfo=`dpkg -f $i`
   pkg=`echo "$debInfo" | grep "Package: " | cut -c 10- | tr -d "\n\r"`

   section=`echo "$debInfo" | grep "Section: " | cut -c 10- | tr -d "\n\r"`
   section="${section//'"'/\\\"}"

   name=`echo "$debInfo" | grep "Name: " | cut -c 7- | tr -d "\n\r"`
   name="${name//'"'/\\\"}"

   vers=`echo "$debInfo" | grep "Version: " | cut -c 10- | tr -d "\n\r"`
   vers="${vers//'"'/\\\"}"

   author=`echo "$debInfo" | grep "Author: " | cut -c 9- | tr -d "\n\r"`
   author="${author//'"'/\\\"}"

   depends=`echo "$debInfo" | grep "Depends: " | cut -c 10- | tr -d "\n\r"`
   depends="${depends//'"'/\\\"}"

   description=`echo "$debInfo" | grep "Description: " | cut -c 14- | tr -d "\n\r"`
   description="${description//'"'/\\\"}"

   arch=`echo "$debInfo" | grep "Architecture: " | cut -c 15- | tr -d "\n\r"`
   arch="${arch//'"'/\\\"}"

   size=$(du -b $i | cut -f1)
   time=$(date +%s -r $i)
    
   echo '{"Name":"'$name'","Version":"'$vers'","Section":"'$section'","Package":"'$pkg'","Author":"'$author'","Depends":"'$depends'","Descript":"'$description'","Arch":"'$arch'","Size":"'$size'","Time":"'$time'000"},' >> all.pkgs
#Building to json done==============
  leng=${#pkg}
  leng=`expr $leng + 1`
  exists=`echo "$compatity" | grep "$pkg " | cut -c "$leng"- | tr -d "\n\r"`
  if [[ -z $exists ]]; then
     echo "$pkg ($name)? "
     read tmp
     echo "$pkg $tmp" >> compatity.txt;
  fi
done

echo "{}]" >> all.pkgs
}
echo "------------------"
echo "Đang tạo tệp Packages...."
apt-ftparchive packages ./Deb > ./Packages;
#sed -i -e '/^SHA/d' ./Packages;
bzip2 -c9k ./Packages > ./Packages.bz2;
echo "------------------"
echo "Đang tạo tệp Release...."
printf "Origin: Hoàng Đình Phong\nLabel: Hoàng Đình Phong\nSuite: stable\nVersion: 1.0\nCodename: ios\nArchitecture: iphoneos-arm\nComponents: main\nDescription: Hoàng Đình Phong\nMD5Sum:\n "$(cat ./Packages | md5sum | cut -d ' ' -f 1)" "$(stat ./Packages --printf="%s")" Packages\n "$(cat ./Packages.bz2 | md5sum | cut -d ' ' -f 1)" "$(stat ./Packages.bz2 --printf="%s")" Packages.bz2\n" >Release;

echo "------------------"
echo "Xong! 👌"
exit 0;